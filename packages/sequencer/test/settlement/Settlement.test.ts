import "reflect-metadata";
import {
  Field,
  Mina,
  PrivateKey,
  ProvableExtended,
  PublicKey,
  UInt64,
  Group,
  Bool,
  Poseidon,
  AccountUpdate,
  Account,
} from "o1js";
import {
  AppChain,
  BlockStorageNetworkStateModule,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "@proto-kit/sdk";
import {
  ACTIONS_EMPTY_HASH,
  Deposit,
  MinaActions,
  MinaPrefixedProvableHashList,
  NetworkState,
  ReturnType,
  RuntimeTransaction,
  SettlementContractModule,
  VanillaProtocol,
} from "@proto-kit/protocol";
import {
  BlockProducerModule,
  BlockTrigger,
  ComputedBlock,
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
  runtimeMethod,
} from "@proto-kit/module";
import { container } from "tsyringe";
import { Balance } from "../integration/mocks/Balance";
import { SettlementModule } from "../../src/settlement/SettlementModule";
import {
  ArgumentTypes,
  EMPTY_PUBLICKEY,
  hashWithPrefix,
  log,
  ToFieldable,
} from "@proto-kit/common";
import { MinaBaseLayer } from "../../src/protocol/baselayer/MinaBaseLayer";
import { MessageStorage } from "../../src/storage/repositories/MessageStorage";
import { Actions } from "o1js/dist/node/lib/account_update";
import { expect } from "@jest/globals";
import { Withdrawals } from "../integration/mocks/Withdrawals";
import { WithdrawalQueue } from "../../src/settlement/messages/WithdrawalQueue";

log.setLevel("DEBUG");

describe("settlement contracts", () => {
  let localInstance: ReturnType<typeof Mina.LocalBlockchain>;

  const sequencerKey = PrivateKey.random();
  const zkAppKey = PrivateKey.random();

  let trigger: ManualBlockTrigger;
  let settlementModule: SettlementModule;
  let blockQueue: UnprovenBlockQueue;

  function setupAppChain() {
    const runtime = Runtime.from({
      modules: {
        Balances: Balance,
        Withdrawals,
      },
    });

    const sequencer = Sequencer.from({
      modules: {
        Database: InMemoryDatabase,
        Mempool: PrivateMempool,
        LocalTaskWorkerModule,
        BaseLayer: MinaBaseLayer,
        BlockProducerModule,
        UnprovenProducerModule,
        BlockTrigger: ManualBlockTrigger,
        TaskQueue: LocalTaskQueue,
        SettlementModule: SettlementModule,
        OutgoingMessageQueue: WithdrawalQueue,
      },
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
    console.log(
      `block ${batch?.proof.publicInput.incomingMessagesHash} -> ${batch?.proof.publicOutput.incomingMessagesHash}`
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

    const localChain = baseLayer.network as ReturnType<
      typeof Mina.LocalBlockchain
    >;

    localChain.addAccount(sequencerKey.toPublicKey(), String(10 * 1e9));
    localInstance = localChain;
  }, 50_000);

  it.skip("should produce equal commitments for the actions hash", async () => {
    const empty = Actions.emptyActionState();

    expect(empty.toString()).toStrictEqual(ACTIONS_EMPTY_HASH.toString());

    const depositTx = RuntimeTransaction.fromMessage({
      methodId: Field(
        settlementModule.generateMethodIdMap()["Balances.deposit"]
      ),
      argsHash: Poseidon.hash(
        Deposit.toFields({
          address: PrivateKey.random().toPublicKey(),
          amount: UInt64.from(100),
        })
      ),
    });

    const txHash1 = Actions.pushEvent(Actions.empty(), depositTx.hashData());
    const hash1 = Actions.updateSequenceState(empty, txHash1.hash);

    const actionHash = MinaActions.actionHash(depositTx.hashData());

    const list = new MinaPrefixedProvableHashList(
      Field,
      "MinaZkappSeqEvents**",
      empty
    );
    list.push(actionHash);

    const hash2 = list.commitment;

    expect(hash1.toString()).toStrictEqual(hash2.toString());
  });

  it.skip("should deposit and be able to compute the actionhash offchain", async () => {
    // Deploy contract
    const tx = await settlementModule.deploy(zkAppKey);
    await tx.wait();

    console.log("Deployed");

    const contract = await settlementModule.getContract();

    const startingActionHash = contract.account.actionState.get();
    expect(startingActionHash.toString()).toStrictEqual(
      ACTIONS_EMPTY_HASH.toString()
    );

    const userKey = localInstance.testAccounts[0].privateKey;

    const tx2 = await Mina.transaction(
      { sender: userKey.toPublicKey(), fee: 0.01 * 1e9 },
      () => {
        contract.deposit(UInt64.from(100));
      }
    );
    await tx2.prove();
    tx2.sign([userKey]);
    await tx2.send();

    console.log("Deposited");

    const actionHash1 = contract.account.actionState.get();
    const actions = localInstance.getActions(contract.address);

    const depositTx = RuntimeTransaction.fromMessage({
      methodId: Field(
        settlementModule.generateMethodIdMap()["Balances.deposit"]
      ),
      argsHash: Poseidon.hash(
        Deposit.toFields({
          address: userKey.toPublicKey(),
          amount: UInt64.from(100),
        })
      ),
    });

    const prefix = "MinaZkappEvent******";
    const txHash2 = hashWithPrefix(prefix, depositTx.hashData());
    const txHash21 = hashWithPrefix("MinaZkappSeqEvents**", [
      Actions.empty().hash,
      txHash2,
    ]);

    const list = new MinaPrefixedProvableHashList(
      Field,
      "MinaZkappSeqEvents**",
      startingActionHash
    );
    list.push(txHash21);

    expect(list.commitment.toString()).toStrictEqual(actionHash1.toString());
  });

  it.skip("should produce a valid batch with one incoming message", async () => {
    const tx = createTransaction({
      method: ["Balances", "deposit"],
      privateKey: sequencerKey,
      args: [
        new Deposit({
          address: sequencerKey.toPublicKey(),
          amount: UInt64.from(100),
        }),
      ] as any,
      nonce: 0,
    });
    tx.isMessage = true;
    tx.sender = EMPTY_PUBLICKEY;
    tx.nonce = UInt64.zero;

    // const ignored = await trigger.produceBlock();

    await (
      appChain.sequencer.resolve("MessageStorage") as MessageStorage
    ).pushMessages(ACTIONS_EMPTY_HASH.toString(), "0", [tx]);

    const [block, batch] = await trigger.produceBlock();

    expect(block).toBeDefined();
  });

  let nonceCounter = 0;
  let user0Nonce = 0;

  it("should deploy", async () => {
    // Deploy contract
    const tx = await settlementModule.deploy(zkAppKey, { nonce: nonceCounter });
    await tx.wait();

    nonceCounter += 2;

    console.log("Deployed");
  }, 60000);

  it.skip("should settle", async () => {
    let [, batch] = await createBatch(true);

    const lastBlock = await blockQueue.getLatestBlock();

    const tx2 = await settlementModule.settleBatch(
      batch!,
      NetworkState.empty(),
      lastBlock!.metadata.afterNetworkState,
      {
        nonce: nonceCounter++,
      }
    );
    await tx2.wait();

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
        contract.deposit(UInt64.from(100));
      }
    );
    await tx.prove();
    tx.sign([userKey]);
    await tx.send();

    const actions = Mina.getActions(contract.address);

    expect(actions).toHaveLength(1);

    const [, batch] = await createBatch(false);
    let lastBlock = await blockQueue.getLatestBlock();

    console.log("Settling");

    const tx2 = await settlementModule.settleBatch(
      batch!,
      lastBlock!.block.networkState.before,
      lastBlock!.metadata.afterNetworkState,
      {
        nonce: nonceCounter++,
      }
    );
    await tx2.wait();

    const [block2, batch2] = await createBatch(false);

    expect(batch2!.bundles).toHaveLength(1);
    expect(batch2!.bundles[0]).toHaveLength(1);

    lastBlock = await blockQueue.getLatestBlock();

    const tx3 = await settlementModule.settleBatch(
      batch2!,
      lastBlock!.block.networkState.before,
      lastBlock!.metadata.afterNetworkState,
      {
        nonce: nonceCounter++,
      }
    );
    await tx3.wait();

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

    const lastBlockMetadata = await blockQueue.getLatestBlock();
    const tx1 = await settlementModule.settleBatch(
      batch!,
      block!.networkState.before,
      lastBlockMetadata!.metadata.afterNetworkState,
      {
        nonce: nonceCounter++,
      }
    );
    await tx1.wait();

    const txs = await settlementModule.sendRollupTransactions({
      nonce: nonceCounter++,
    });

    expect(txs).toHaveLength(1);

    const account = Mina.getAccount(userKey.toPublicKey(), contract.token.id);

    expect(account.balance.toBigInt()).toStrictEqual(BigInt(1e9) * 49n);
  }, 100_000);

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
