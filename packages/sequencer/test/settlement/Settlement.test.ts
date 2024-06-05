import { log, RollupMerkleTree } from "@proto-kit/common";
import { VanillaProtocolModules } from "@proto-kit/library";
import { Runtime } from "@proto-kit/module";
import {
  BlockProverPublicInput,
  NetworkState,
  Protocol,
  ReturnType,
  SettlementContractModule,
} from "@proto-kit/protocol";
import {
  AppChain,
  BlockStorageNetworkStateModule,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "@proto-kit/sdk";
import { AccountUpdate, Field, Mina, PrivateKey, UInt64 } from "o1js";
import "reflect-metadata";
import { container } from "tsyringe";

import {
  ManualBlockTrigger,
  PendingTransaction,
  PrivateMempool,
  UnprovenBlockQueue,
  SettlementModule,
} from "../../src";
import { MinaBaseLayer } from "../../src/protocol/baselayer/MinaBaseLayer";
import { BlockProofSerializer } from "../../src/protocol/production/helpers/BlockProofSerializer";
import { WithdrawalQueue } from "../../src/settlement/messages/WithdrawalQueue";
import { SettlementProvingTask } from "../../src/settlement/tasks/SettlementProvingTask";
import { Balance } from "../integration/mocks/Balance";
import { Withdrawals } from "../integration/mocks/Withdrawals";
import { testingSequencerFromModules } from "../TestingSequencer";
import { createTransaction } from "../integration/utils";
import { MinaTransactionSender } from "../../src/settlement/transactions/MinaTransactionSender";

log.setLevel("INFO");

describe("settlement contracts", () => {
  let localInstance: Awaited<ReturnType<typeof Mina.LocalBlockchain>>;

  const sequencerKey = PrivateKey.random();
  const settlementKey = PrivateKey.random();
  const dispatchKey = PrivateKey.random();

  let trigger: ManualBlockTrigger;
  let settlementModule: SettlementModule;
  let blockQueue: UnprovenBlockQueue;

  let blockSerializer: BlockProofSerializer;

  function setupAppChain() {
    const runtime = Runtime.from({
      modules: {
        Balances: Balance,
        Withdrawals,
      },
    });

    const sequencer = testingSequencerFromModules(
      {
        BaseLayer: MinaBaseLayer,
        SettlementModule: SettlementModule,
        OutgoingMessageQueue: WithdrawalQueue,
      },
      {
        SettlementProvingTask,
      }
    );

    const appchain = AppChain.from({
      Runtime: runtime,
      Sequencer: sequencer,

      Protocol: Protocol.from({
        modules: {
          ...VanillaProtocolModules.mandatoryModules({}),
          SettlementContractModule: SettlementContractModule.fromDefaults(),
        },
      }),

      modules: {
        Signer: InMemorySigner,
        TransactionSender: InMemoryTransactionSender,
        QueryTransportModule: StateServiceQueryModule,
        NetworkStateTransportModule: BlockStorageNetworkStateModule,
      },
    });

    appchain.configure({
      Runtime: {
        Balances: {
          totalSupply: UInt64.from(1000),
        },
        Withdrawals: {},
      },

      Sequencer: {
        Database: {},
        BlockTrigger: {},
        Mempool: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: {},
        OutgoingMessageQueue: {},
        BaseLayer: {
          network: {
            local: true,
          },
        },
        UnprovenProducerModule: {},
        SettlementModule: {
          feepayer: sequencerKey,
        },

        TaskQueue: {
          simulatedDuration: 0,
        },
      },
      Protocol: {
        StateTransitionProver: {},
        BlockHeight: {},
        AccountState: {},
        BlockProver: {},
        LastStateRoot: {},
        SettlementContractModule: {
          SettlementContract: {
            withdrawalStatePath: "Withdrawals.withdrawals",
            withdrawalMethodPath: "Withdrawals.withdraw",
          },
          DispatchContract: {
            incomingMessagesMethods: {
              deposit: "Balances.deposit",
            },
          },
        },
      },
      TransactionSender: {},
      QueryTransportModule: {},
      Signer: {
        signer: sequencerKey,
      },
      NetworkStateTransportModule: {},
    });

    return appchain;
  }

  let appChain: ReturnType<typeof setupAppChain>;

  async function createBatch(
    withTransactions: boolean,
    customNonce: number = 0,
    txs: PendingTransaction[] = []
  ) {
    const mempool = appChain.sequencer.resolve("Mempool") as PrivateMempool;
    if (withTransactions) {
      const { key } = localInstance.testAccounts[0];
      const tx = createTransaction({
        runtime: appChain.runtime,
        method: ["Balances", "addBalance"],
        privateKey: key,
        args: [key.toPublicKey(), UInt64.from(1e9 * 100)],
        nonce: customNonce,
      });

      await mempool.add(tx);
    }
    txs.forEach((tx) => {
      mempool.add(tx);
    });

    const result = await trigger.produceBlock();
    const [block, batch] = result;

    console.log(
      `block ${block?.height.toString()} ${block?.fromMessagesHash.toString()} -> ${block?.toMessagesHash.toString()}`
    );
    const proof = await blockSerializer
      .getBlockProofSerializer()
      .fromJSONProof(batch!.proof);
    console.log(
      `block ${proof.publicInput.incomingMessagesHash} -> ${proof.publicOutput.incomingMessagesHash}`
    );

    return result;
  }

  beforeAll(async () => {
    appChain = setupAppChain();

    await appChain.start(container.createChildContainer());

    settlementModule = appChain.sequencer.resolve(
      "SettlementModule"
    ) as SettlementModule;

    trigger =
      appChain.sequencer.dependencyContainer.resolve<ManualBlockTrigger>(
        "BlockTrigger"
      );
    blockQueue = appChain.sequencer.resolve(
      "UnprovenBlockQueue"
    ) as UnprovenBlockQueue;

    const baseLayer = appChain.sequencer.resolve("BaseLayer") as MinaBaseLayer;

    blockSerializer =
      appChain.sequencer.dependencyContainer.resolve(BlockProofSerializer);

    const localChain = baseLayer.network as Awaited<
      ReturnType<typeof Mina.LocalBlockchain>
    >;

    localChain.addAccount(sequencerKey.toPublicKey(), String(20 * 1e9));
    localInstance = localChain;
  }, 50_000);

  let nonceCounter = 0;
  let user0Nonce = 0;

  it("should deploy", async () => {
    // Deploy contract
    await settlementModule.deploy(settlementKey, dispatchKey, {
      nonce: nonceCounter,
    });

    nonceCounter += 2;

    console.log("Deployed");
  }, 120_000);

  it("should settle", async () => {
    const [, batch] = await createBatch(true);

    const input = BlockProverPublicInput.fromFields(
      batch!.proof.publicInput.map((x) => Field(x))
    );
    expect(input.stateRoot.toBigInt()).toStrictEqual(
      RollupMerkleTree.EMPTY_ROOT
    );

    const lastBlock = await blockQueue.getLatestBlock();

    await trigger.settle(batch!);
    nonceCounter++;

    // TODO Check Smartcontract tx layout (call to dispatch with good preconditions, etc)

    console.log("Block settled");

    const { settlement } = settlementModule.getContracts();
    expect(settlement.networkStateHash.get().toBigInt()).toStrictEqual(
      lastBlock!.metadata.afterNetworkState.hash().toBigInt()
    );
    expect(settlement.stateRoot.get().toBigInt()).toStrictEqual(
      lastBlock!.metadata.stateRoot
    );
    expect(settlement.blockHashRoot.get().toBigInt()).toStrictEqual(
      lastBlock!.metadata.blockHashRoot
    );
  }, 120_000);

  it("should include deposit", async () => {
    const { settlement, dispatch } = settlementModule.getContracts();

    const userKey = localInstance.testAccounts[0].key;

    const contractBalanceBefore = settlement.account.balance.get();

    const tx = await Mina.transaction(
      { sender: userKey.toPublicKey(), fee: 0.01 * 1e9, nonce: user0Nonce++ },
      async () => {
        const au = AccountUpdate.createSigned(userKey.toPublicKey());
        au.balance.subInPlace(UInt64.from(100));
        await dispatch.deposit(UInt64.from(100));
      }
    ).sign([userKey]);

    await appChain.sequencer
      .resolveOrFail("TransactionSender", MinaTransactionSender)
      .proveAndSendTransaction(tx);

    const actions = Mina.getActions(dispatch.address);
    const balanceDiff = settlement.account.balance
      .get()
      .sub(contractBalanceBefore);

    expect(actions).toHaveLength(1);
    expect(balanceDiff.toBigInt()).toBe(100n);

    const [, batch] = await createBatch(false);

    console.log("Settling");

    await trigger.settle(batch!);
    nonceCounter++;

    const [, batch2] = await createBatch(false);

    const networkstateHash = Mina.activeInstance.getAccount(settlement.address);
    console.log("On-chain values");
    console.log(networkstateHash.zkapp!.appState.map((x) => x.toString()));

    console.log(
      `Empty Network State ${NetworkState.empty().hash().toString()}`
    );
    console.log(batch!.toNetworkState.hash().toString());
    console.log(batch2!.fromNetworkState.hash().toString());

    expect(batch!.toNetworkState.hash().toString()).toStrictEqual(
      batch2!.fromNetworkState.hash().toString()
    );

    expect(batch2!.bundles).toHaveLength(1);

    await trigger.settle(batch2!);
    nonceCounter++;

    const balance = await appChain.query.runtime.Balances.balances.get(
      userKey.toPublicKey()
    );

    expect(balance).toBeDefined();
  }, 100000);

  it("should process withdrawal", async () => {
    const { settlement } = settlementModule.getContracts();

    // Send mina to contract
    const usertx = await Mina.transaction(
      {
        sender: localInstance.testAccounts[1],
        fee: "10000",
      },
      async () => {
        const au = AccountUpdate.createSigned(localInstance.testAccounts[1]);
        au.send({
          to: settlement.address,
          amount: UInt64.from(100 * 1e9),
        });
      }
    );
    usertx.sign([localInstance.testAccounts[1].key]);
    // await usertx.send();

    await appChain.sequencer
      .resolveOrFail("TransactionSender", MinaTransactionSender)
      .proveAndSendTransaction(usertx);

    const userKey = localInstance.testAccounts[0].key;

    log.setLevel("TRACE");

    const withdrawalTx = createTransaction({
      runtime: appChain.runtime,
      method: ["Withdrawals", "withdraw"],
      args: [userKey.toPublicKey(), UInt64.from(50 * 1e9)],
      nonce: 2,
      privateKey: userKey,
    });
    const [block, batch] = await createBatch(true, 1, [withdrawalTx]);

    console.log("Test netowrkstate");
    console.log(NetworkState.toJSON(block!.networkState.during));
    console.log(NetworkState.toJSON(batch!.toNetworkState));

    await trigger.settle(batch!);
    nonceCounter++;

    const txs = await settlementModule.sendRollupTransactions({
      nonce: nonceCounter++,
    });

    expect(txs).toHaveLength(1);

    const account = Mina.getAccount(
      userKey.toPublicKey(),
      settlement.deriveTokenId()
    );

    expect(account.balance.toBigInt()).toStrictEqual(BigInt(1e9) * 49n);
  }, 100_000000);

  it("should be able to redeem withdrawal", async () => {
    const { settlement } = settlementModule.getContracts();

    const userKey = localInstance.testAccounts[0].key;

    const balanceBefore = Mina.getAccount(
      userKey.toPublicKey()
    ).balance.toBigInt();

    const amount = BigInt(1e9 * 49);

    const tx = await Mina.transaction(
      {
        sender: userKey.toPublicKey(),
        nonce: user0Nonce++,
        fee: 10000,
      },
      async () => {
        const mintAU = AccountUpdate.create(userKey.toPublicKey());
        mintAU.balance.addInPlace(amount);
        // mintAU.requireSignature(); // TODO ?
        await settlement.redeem(mintAU);
      }
    );
    tx.sign([userKey]);
    await tx.prove();
    await tx.send();

    const balanceAfter = Mina.getAccount(
      userKey.toPublicKey()
    ).balance.toBigInt();

    expect(balanceAfter - balanceBefore).toBe(amount - 10000n);
  }, 100_000);
});
