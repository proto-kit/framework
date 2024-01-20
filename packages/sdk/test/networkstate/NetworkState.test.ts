import "reflect-metadata";
import { Runtime } from "@proto-kit/module";
import {
  ManualBlockTrigger,
  PrivateMempool,
  CachedMerkleTreeStore,
  AsyncMerkleTreeStore,
} from "@proto-kit/sequencer";
import {
  ReturnType,
  VanillaProtocol
} from "@proto-kit/protocol";
import { log, RollupMerkleTree } from "@proto-kit/common";
import { Field, PrivateKey, UInt64 } from "o1js";
import { Balance } from "./Balance";
import {
  AppChain,
  InMemorySigner,
  TestingAppChain
} from "../../src";
import { container } from "tsyringe";

describe("block production", () => {
  let runtime: Runtime<{ Balance: typeof Balance }>;

  let protocol: InstanceType<ReturnType<typeof VanillaProtocol.create>>

  let blockTrigger: ManualBlockTrigger;
  let mempool: PrivateMempool;

  let appchain: AppChain<any, any, any, any>;

  beforeEach(async () => {
    // container.reset();

    log.setLevel(log.levels.DEBUG);

    const app = TestingAppChain.fromRuntime({
      modules: {
        Balance
      }
    })

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
        Database: {},
      },
      Protocol: {
        AccountState: {},
        BlockProver: {},
        StateTransitionProver: {},
        BlockHeight: {},
        LastStateRoot: {},
      },
      QueryTransportModule: {},
      Signer: {
        signer: PrivateKey.random(),
      },
      TransactionSender: {},
    });


    // Start AppChain
    await app.start(container.createChildContainer());
    appchain = app;

    ({ runtime, protocol } = app);

    const sequencer = app.sequencer;
    blockTrigger = sequencer.resolve("BlockTrigger");
    mempool = sequencer.resolve("Mempool");
  });

  it("stateproof test", async () => {
    log.setLevel("INFO");

    const sender = (appchain.resolve("Signer") as InMemorySigner).config.signer;
    const senderAddress = sender.toPublicKey();

    const store =
      appchain.sequencer.dependencyContainer.resolve<AsyncMerkleTreeStore>(
        "AsyncMerkleStore"
      );
    const tree = new RollupMerkleTree(new CachedMerkleTreeStore(store));

    const tx = await appchain.transaction(senderAddress, () => {
      runtime.resolve("Balance").setBalance(senderAddress, UInt64.from(100));
    });
    await tx.sign();
    await tx.send();

    const [block, batch] = await blockTrigger.produceBlock();

    const path = runtime.resolve("Balance").balances.getPath(senderAddress);

    const cmt = new CachedMerkleTreeStore(store);
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
    console.log(batch!.proof.publicOutput.stateRoot.toString());

    const [block2, batch2] = await blockTrigger.produceBlock();

    console.log(block!.transactions[0].statusMessage);
    expect(block2!.transactions[0].status.toBoolean()).toBe(true);
  }, 60000);

  it("should produce a valid block", async () => {
    expect.assertions(3);

    const sender = (appchain.resolve("Signer") as InMemorySigner).config.signer;

    const tx = await appchain.transaction(sender.toPublicKey(), () => {
      runtime.resolve("Balance").assertLastBlockHash(Field(RollupMerkleTree.EMPTY_ROOT));
    });
    await tx.sign();
    await tx.send();

    const [block, batch] = await blockTrigger.produceBlock();
    expect(block!.transactions[0].status.toBoolean()).toBe(true);

    const tx2 = await appchain.transaction(sender.toPublicKey(), () => {
      runtime
        .resolve("Balance")
        .assertLastBlockHash(batch!.proof.publicOutput.stateRoot);
    });

    await tx2.sign();
    await tx2.send();

    const [block2, batch2] = await blockTrigger.produceBlock();
    expect(block2!.transactions[0].status.toBoolean()).toBe(true);

    const tx3 = await appchain.transaction(sender.toPublicKey(), () => {
      runtime
        .resolve("Balance")
        .assertLastBlockHash(batch!.proof.publicOutput.stateRoot);
    });

    await tx3.sign();
    await tx3.send();

    const [block3, batch3] = await blockTrigger.produceBlock();
    expect(block3!.transactions[0].status.toBoolean()).toBe(false);
  }, 30000);
});
