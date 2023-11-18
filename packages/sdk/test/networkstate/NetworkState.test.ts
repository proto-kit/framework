import { Runtime } from "@proto-kit/module";
import {
  AsyncStateService,
  BlockProducerModule,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  Sequencer,
  CachedMerkleTreeStore,
} from "@proto-kit/sequencer";
import {
  AccountStateModule,
  AsyncMerkleTreeStore,
  BlockProver,
  Protocol,
  RollupMerkleTree,
  StateTransitionProver,
  VanillaProtocol,
} from "@proto-kit/protocol";
import { log } from "@proto-kit/common";
import { Field, Poseidon, PrivateKey, UInt64 } from "o1js";
import { Balance } from "./Balance";
import {
  AppChain,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "../../src";

describe("block production", () => {
  let runtime: Runtime<{ Balance: typeof Balance }>;
  let sequencer: Sequencer<{
    Mempool: typeof PrivateMempool;
    LocalTaskWorkerModule: typeof LocalTaskWorkerModule;
    BaseLayer: typeof NoopBaseLayer;
    BlockProducerModule: typeof BlockProducerModule;
    BlockTrigger: typeof ManualBlockTrigger;
    TaskQueue: typeof LocalTaskQueue;
  }>;

  let protocol: Protocol<{
    AccountState: typeof AccountStateModule;
    BlockProver: typeof BlockProver;
    StateTransitionProver: typeof StateTransitionProver;
  }>;

  let blockTrigger: ManualBlockTrigger;
  let mempool: PrivateMempool;

  let appchain: AppChain<any, any, any, any>;

  beforeEach(async () => {
    // container.reset();

    log.setLevel(log.levels.DEBUG);

    const runtimeClass = Runtime.from({
      modules: {
        Balance,
      },

      config: {
        Balance: {},
      },
    });

    const sequencerClass = Sequencer.from({
      modules: {
        Mempool: PrivateMempool,
        LocalTaskWorkerModule,
        BaseLayer: NoopBaseLayer,
        BlockProducerModule,
        BlockTrigger: ManualBlockTrigger,
        TaskQueue: LocalTaskQueue,
      },

      config: {
        BlockTrigger: {},
        Mempool: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: {},
        BaseLayer: {},
        TaskQueue: {},
      },
    });

    const protocolClass = VanillaProtocol.from(
      { AccountState: AccountStateModule },
      { AccountState: {}, StateTransitionProver: {}, BlockProver: {} }
    );

    const app = AppChain.from({
      runtime: runtimeClass,
      sequencer: sequencerClass,
      protocol: protocolClass,
      modules: {
        QueryTransportModule: StateServiceQueryModule,
        Signer: InMemorySigner,
        TransactionSender: InMemoryTransactionSender,
      },
    });

    app.configure({
      Runtime: {
        Balance: {},
      },
      Sequencer: {
        BlockTrigger: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: {},
        BaseLayer: {},
        TaskQueue: {},
        Mempool: {},
      },
      Protocol: {
        AccountState: {},
        BlockProver: {},
        StateTransitionProver: {},
      },
      QueryTransportModule: {},
      Signer: {
        signer: PrivateKey.random(),
      },
      TransactionSender: {},
    });

    // Start AppChain
    await app.start();
    appchain = app;

    ({ runtime, sequencer, protocol } = app);

    blockTrigger = sequencer.resolve("BlockTrigger");
    mempool = sequencer.resolve("Mempool");
  });

  it("stateproof test", async () => {
    log.setLevel("INFO");

    const sender = (appchain.resolve("Signer") as InMemorySigner).config.signer;
    const senderAddress = sender.toPublicKey();

    const store =
      sequencer.dependencyContainer.resolve<AsyncMerkleTreeStore>(
        "AsyncMerkleStore"
      );
    const tree = new RollupMerkleTree(new CachedMerkleTreeStore(store));

    const tx = await appchain.transaction(senderAddress, () => {
      runtime.resolve("Balance").setBalance(senderAddress, UInt64.from(100));
    });
    await tx.sign();
    await tx.send();

    const block = await blockTrigger.produceBlock();

    const path = runtime.resolve("Balance").balances.getPath(senderAddress);

    const cmt = new CachedMerkleTreeStore(store)
    await cmt.preloadKey(path.toBigInt());
    const tree2 = new RollupMerkleTree(cmt);
    const witness = tree2.getWitness(path.toBigInt());

    console.log(tree2.getNode(0, path.toBigInt()).toBigInt());

    const hash = witness.calculateRoot(tree2.getNode(0, path.toBigInt()));

    const tx2 = await appchain.transaction(senderAddress, () => {
      runtime.resolve("Balance").assertLastBlockHash(hash);
    });
    await tx2.sign();
    await tx2.send();

    console.log("Path: " + path.toString());
    console.log(hash.toString());
    console.log(tree.getRoot().toString());
    console.log(block!.proof.publicOutput.stateRoot.toString());

    const block2 = await blockTrigger.produceBlock();

    console.log(block2!.txs[0].statusMessage);
    expect(block2!.txs[0].status).toBe(true);
  }, 60000);

  it("should produce a valid block", async () => {
    expect.assertions(3);

    const sender = (appchain.resolve("Signer") as InMemorySigner).config.signer;

    const tx = await appchain.transaction(sender.toPublicKey(), () => {
      runtime.resolve("Balance").assertLastBlockHash(Field(0));
    });
    await tx.sign();
    await tx.send();

    const block = await blockTrigger.produceBlock();
    expect(block!.txs[0].status).toBe(true);

    const tx2 = await appchain.transaction(sender.toPublicKey(), () => {
      runtime
        .resolve("Balance")
        .assertLastBlockHash(block!.proof.publicOutput.stateRoot);
    });

    await tx2.sign();
    await tx2.send();

    const block2 = await blockTrigger.produceBlock();
    expect(block2!.txs[0].status).toBe(true);

    const tx3 = await appchain.transaction(sender.toPublicKey(), () => {
      runtime
        .resolve("Balance")
        .assertLastBlockHash(block!.proof.publicOutput.stateRoot);
    });

    await tx3.sign();
    await tx3.send();

    const block3 = await blockTrigger.produceBlock();
    expect(block3!.txs[0].status).toBe(false);
  }, 30000);
});
