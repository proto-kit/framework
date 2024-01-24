import "reflect-metadata";
import {
  Field,
  Mina,
  PrivateKey,
  ProvableExtended,
  PublicKey,
  UInt64,
  Group, Bool, Poseidon
} from "o1js";
import {
  AppChain,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "@proto-kit/sdk";
import {
  AccountStateModule,
  ACTIONS_EMPTY_HASH,
  BlockHeightHook,
  BlockProver,
  Deposit, MinaPrefixedProvableHashList,
  NetworkState,
  Protocol,
  ReturnType, RuntimeTransaction,
  SettlementContractModule,
  StateTransitionProver,
  VanillaProtocol
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
import { ArgumentTypes, EMPTY_PUBLICKEY, log, ToFieldable } from "@proto-kit/common";
import { MinaBaseLayer } from "../../src/protocol/baselayer/MinaBaseLayer";
import { MessageStorage } from "../../src/storage/repositories/MessageStorage";
import { Actions } from "o1js/dist/node/lib/account_update";
import { expect } from "@jest/globals";

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
        // NetworkStateTransportModule: BlockStorageNetworkStateModule,
      },
    });

    appchain.configure({
      Runtime: {
        Balances: {
          totalSupply: UInt64.from(1000),
        },
      },

      Sequencer: {
        Database: {},
        BlockTrigger: {},
        Mempool: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: {},
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
        SettlementContractModule: {},
      },
      TransactionSender: {},
      QueryTransportModule: {},
      Signer: {
        signer: sequencerKey,
      },
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

  async function createBatch(withTransactions: boolean) {
    if (withTransactions) {
      const tx = createTransaction({
        method: ["Balances", "addBalance"],
        privateKey: sequencerKey,
        args: [sequencerKey.toPublicKey(), UInt64.from(100)] as any,
        nonce: 0,
      });

      (appChain.sequencer.resolve("Mempool") as PrivateMempool).add(tx);
    }

    const [, batch] = await trigger.produceBlock();
    return batch!;
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

  it("should produce equal commitments for the actions hash", async () => {
    const empty = Actions.emptyActionState()

    expect(empty.toString()).toStrictEqual(ACTIONS_EMPTY_HASH.toString());

    const hash1 = Actions.updateSequenceState(empty, Field(10));

    const list = new MinaPrefixedProvableHashList(Field, "MinaZkappSeqEvents**", empty);
    list.push(Field(10));

    const hash2 = list.commitment;

    expect(hash1.toString()).toStrictEqual(hash2.toString())
  });

  it.skip("should deposit and be able to compute the actionhash offchain", async () => {
    // Deploy contract
    const tx = await settlementModule.deploy(zkAppKey);
    await tx.wait();

    console.log("Deployed");

    const contract = await settlementModule.getContract();

    const startingActionHash = contract.account.actionState.get();
    expect(startingActionHash.toString()).toStrictEqual(ACTIONS_EMPTY_HASH.toString());

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

    console.log("Deposited")

    const actionHash1 = contract.account.actionState.get();
    const actions = localInstance.getActions(contract.address);

    const depositTx = RuntimeTransaction.fromMessage({
      methodId: Field(settlementModule.generateMethodIdMap()["Balances.deposit"]),
      argsHash: Poseidon.hash(Deposit.toFields({ address: userKey.toPublicKey(), amount: UInt64.from(100) }))
    });

    const list = new MinaPrefixedProvableHashList(Field, "MinaZkappSeqEvents**", startingActionHash);
    list.push(depositTx.hash())

    const list2 = new MinaPrefixedProvableHashList(Field, "MinaZkappSeqEvents**", Field(0));
    list2.push(depositTx.hash());

    expect(list.commitment.toString()).toStrictEqual(actionHash1.toString())
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

  it("should settle", async () => {
    let batch: ComputedBlock = await createBatch(false);

    const lastBlock = await blockQueue.getLatestBlock();

    // Deploy contract
    const tx = await settlementModule.deploy(zkAppKey);
    await tx.wait();

    console.log("Deployed");

    const tx2 = await settlementModule.settleBatch(
      batch.proof,
      NetworkState.empty(),
      lastBlock!.metadata.afterNetworkState,
      {
        nonce: 2,
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
  }, 500_000);

  it("should include deposit", async () => {
    const contract = await settlementModule.getContract();

    const userKey = localInstance.testAccounts[0].privateKey;

    const tx = await Mina.transaction(
      { sender: userKey.toPublicKey(), fee: 0.01 * 1e9 },
      () => {
        contract.deposit(UInt64.from(100));
      }
    );
    await tx.prove();
    tx.sign([userKey]);
    await tx.send();

    const actions = Mina.getActions(contract.address);

    expect(actions).toHaveLength(1);

    const batch = await createBatch(false);
    let lastBlock = await blockQueue.getLatestBlock();

    console.log("Settling");

    const tx2 = await settlementModule.settleBatch(
      batch.proof,
      lastBlock!.block.networkState.before,
      lastBlock!.metadata.afterNetworkState,
      {
        nonce: 3,
      }
    );
    await tx2.wait();

    const batch2 = await createBatch(false);

    expect(batch2.bundles).toHaveLength(1);
    expect(batch2.bundles[0]).toHaveLength(1);

    lastBlock = await blockQueue.getLatestBlock();

    const tx3 = await settlementModule.settleBatch(
      batch2.proof,
      lastBlock!.block.networkState.before,
      lastBlock!.metadata.afterNetworkState,
      {
        nonce: 4,
      }
    );
    await tx3.wait();

    const balance = await appChain.query.runtime.Balances.balances.get(
      userKey.toPublicKey()
    );

    expect(balance).toBeDefined();
  }, 50000);
});
