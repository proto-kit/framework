import "reflect-metadata";
import { Field, Mina, PrivateKey, UInt64, AccountUpdate } from "o1js";
import {
  AppChain,
  BlockStorageNetworkStateModule,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "@proto-kit/sdk";
import {
  NetworkState,
  ReturnType,
  SettlementContractModule,
  VanillaProtocol,
} from "@proto-kit/protocol";
import {
  BlockProducerModule,
  BlockTrigger,
  InMemoryDatabase,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PendingTransaction,
  PrivateMempool,
  Sequencer,
  UnprovenBlockQueue,
  UnprovenProducerModule,
  UnsignedTransaction,
} from "../../src";
import {
  MethodIdResolver,
  MethodParameterEncoder,
  Runtime,
} from "@proto-kit/module";
import { container } from "tsyringe";
import { Balance } from "../integration/mocks/Balance";
import { SettlementModule } from "../../src/settlement/SettlementModule";
import { ArgumentTypes, log } from "@proto-kit/common";
import { MinaBaseLayer } from "../../src/protocol/baselayer/MinaBaseLayer";
import { expect } from "@jest/globals";
import { Withdrawals } from "../integration/mocks/Withdrawals";
import { WithdrawalQueue } from "../../src/settlement/messages/WithdrawalQueue";
import { BlockProofSerializer } from "../../src/protocol/production/helpers/BlockProofSerializer";
import {
  DefaultTestingSequencerModules,
  testingSequencerFromModules,
} from "../TestingSequencer";

log.setLevel("DEBUG");

describe("settlement contracts", () => {
  let localInstance: ReturnType<typeof Mina.LocalBlockchain>;

  const sequencerKey = PrivateKey.random();
  const zkAppKey = PrivateKey.random();

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

    const sequencer = testingSequencerFromModules({
      BaseLayer: MinaBaseLayer,
      SettlementModule: SettlementModule,
      OutgoingMessageQueue: WithdrawalQueue,
    });

    const appchain = AppChain.from({
      runtime: runtime,
      sequencer: sequencer,

      protocol: VanillaProtocol.from({
        SettlementContractModule,
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
          withdrawalStatePath: "Withdrawals.withdrawals",
          withdrawalMethodPath: "Withdrawals.withdraw",
          incomingMessagesMethods: {
            deposit: "Balances.deposit",
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

  function createTransaction(spec: {
    privateKey: PrivateKey;
    method: [string, string];
    args: ArgumentTypes;
    nonce: number;
  }) {
    const methodId = appChain.runtime.dependencyContainer
      .resolve<MethodIdResolver>("MethodIdResolver")
      .getMethodId(spec.method[0], spec.method[1]);

    const parameterEncoder = MethodParameterEncoder.fromMethod(
      appChain.runtime.resolve(spec.method[0] as any),
      spec.method[1]
    );
    const { argsFields, argsJSON } = parameterEncoder.encode(spec.args);

    return new UnsignedTransaction({
      methodId: Field(methodId),
      argsFields,
      argsJSON,
      sender: spec.privateKey.toPublicKey(),
      nonce: UInt64.from(spec.nonce),
      isMessage: false,
    }).sign(spec.privateKey);
  }

  async function createBatch(
    withTransactions: boolean,
    txs: PendingTransaction[] = []
  ) {
    const mempool = appChain.sequencer.resolve("Mempool") as PrivateMempool;
    if (withTransactions) {
      const key = localInstance.testAccounts[0].privateKey;
      const tx = createTransaction({
        method: ["Balances", "addBalance"],
        privateKey: key,
        args: [key.toPublicKey(), UInt64.from(1e9 * 100)] as any,
        nonce: 0,
      });

      mempool.add(tx);
    }
    txs.forEach((tx) => {
      mempool.add(tx);
    });

    const result = await trigger.produceBlock();
    const [block, batch] = result;

    console.log(
      `block ${block?.height.toString()} ${block?.fromMessagesHash.toString()} -> ${block?.toMessagesHash.toString()}`
    );
    const proof = blockSerializer
      .getBlockProofSerializer()
      .fromJSONProof(batch!.proof);
    console.log(
      `block ${proof.publicInput.incomingMessagesHash} -> ${proof.publicOutput.incomingMessagesHash}`
    );

    return result;
  }

  let appChain: ReturnType<typeof setupAppChain>;

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

    const localChain = baseLayer.network as ReturnType<
      typeof Mina.LocalBlockchain
    >;

    localChain.addAccount(sequencerKey.toPublicKey(), String(10 * 1e9));
    localInstance = localChain;
  }, 50_000);

  let nonceCounter = 0;
  let user0Nonce = 0;

  it("should deploy", async () => {
    // Deploy contract
    const tx = await settlementModule.deploy(zkAppKey, { nonce: nonceCounter });
    await tx.wait();

    nonceCounter += 2;

    console.log("Deployed");
  }, 60000);

  it("should settle", async () => {
    let [, batch] = await createBatch(true);

    const lastBlock = await blockQueue.getLatestBlock();

    await trigger.settle(batch!);
    nonceCounter++;
    // const tx2 = await settlementModule.settleBatch(batch!, {
    //   nonce: nonceCounter++,
    // });
    // await tx2.wait();

    console.log("Block settled");

    const contract = await settlementModule.getContract();
    expect(contract.networkStateHash.get().toBigInt()).toStrictEqual(
      lastBlock!.metadata.afterNetworkState.hash().toBigInt()
    );
    expect(contract.stateRoot.get().toBigInt()).toStrictEqual(
      lastBlock!.metadata.stateRoot
    );
    expect(contract.blockHashRoot.get().toBigInt()).toStrictEqual(
      lastBlock!.metadata.blockHashRoot
    );
  }, 120_000);

  it("should include deposit", async () => {
    const contract = await settlementModule.getContract();

    const userKey = localInstance.testAccounts[0].privateKey;

    const tx = await Mina.transaction(
      { sender: userKey.toPublicKey(), fee: 0.01 * 1e9, nonce: user0Nonce++ },
      () => {
        const au = AccountUpdate.createSigned(userKey.toPublicKey());
        au.balance.subInPlace(UInt64.from(100));
        contract.deposit(UInt64.from(100));
      }
    );
    await tx.prove();
    tx.sign([userKey]);
    await tx.send();

    const actions = Mina.getActions(contract.address);

    expect(actions).toHaveLength(1);

    const [, batch] = await createBatch(false);

    console.log("Settling");

    await trigger.settle(batch!);
    nonceCounter++;
    // const tx2 = await settlementModule.settleBatch(batch!, {
    //   nonce: nonceCounter++,
    // });
    // await tx2.wait();

    const [block2, batch2] = await createBatch(false);

    expect(batch2!.bundles).toHaveLength(1);

    await trigger.settle(batch2!);
    nonceCounter++;
    // const tx3 = await settlementModule.settleBatch(batch2!, {
    //   nonce: nonceCounter++,
    // });
    // await tx3.wait();

    const balance = await appChain.query.runtime.Balances.balances.get(
      userKey.toPublicKey()
    );

    expect(balance).toBeDefined();
  }, 100000);

  it("should process withdrawal", async () => {
    const contract = await settlementModule.getContract();

    // Send mina to contract
    const usertx = await Mina.transaction(
      {
        sender: localInstance.testAccounts[1].publicKey,
        fee: "10000",
      },
      () => {
        const au = AccountUpdate.createSigned(
          localInstance.testAccounts[1].publicKey
        );
        au.send({
          to: contract.address,
          amount: UInt64.from(100 * 1e9),
        });
      }
    );
    usertx.sign([localInstance.testAccounts[1].privateKey]);
    await usertx.send();

    const userKey = localInstance.testAccounts[0].privateKey;

    const withdrawalTx = createTransaction({
      method: ["Withdrawals", "withdraw"],
      args: [userKey.toPublicKey(), UInt64.from(50 * 1e9)],
      nonce: 1,
      privateKey: userKey,
    });
    const [block, batch] = await createBatch(true, [withdrawalTx]);

    console.log("Test netowrkstate");
    console.log(NetworkState.toJSON(block!.networkState.during));
    console.log(NetworkState.toJSON(batch!.toNetworkState));

    await trigger.settle(batch!);
    nonceCounter++;
    // const tx1 = await settlementModule.settleBatch(batch!, {
    //   nonce: nonceCounter++,
    // });
    // await tx1.wait();

    const txs = await settlementModule.sendRollupTransactions({
      nonce: nonceCounter++,
    });

    expect(txs).toHaveLength(1);

    const account = Mina.getAccount(userKey.toPublicKey(), contract.token.id);

    expect(account.balance.toBigInt()).toStrictEqual(BigInt(1e9) * 49n);
  }, 100_000000);

  it("should be able to redeem withdrawal", async () => {
    const contract = await settlementModule.getContract();

    const userKey = localInstance.testAccounts[0].privateKey;

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
      () => {
        const mintAU = AccountUpdate.create(userKey.toPublicKey());
        mintAU.balance.addInPlace(amount);
        // mintAU.requireSignature(); // TODO ?
        contract.redeem(mintAU);
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
