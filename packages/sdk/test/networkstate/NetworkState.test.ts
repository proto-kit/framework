import "reflect-metadata";
import {
  Balances,
  BalancesKey,
  TokenId,
  TransactionFeeHook,
  UInt64,
} from "@proto-kit/library";
import { Runtime } from "@proto-kit/module";
import {
  ManualBlockTrigger,
  CachedMerkleTreeStore,
  AsyncMerkleTreeStore,
} from "@proto-kit/sequencer";
import {
  BlockProverPublicOutput,
  MandatoryProtocolModulesRecord,
  Protocol,
} from "@proto-kit/protocol";
import { log, RollupMerkleTree, expectDefined } from "@proto-kit/common";
import { Field } from "o1js";
import { container } from "tsyringe";

import { AppChain, InMemorySigner, TestingAppChain } from "../../src";

import { BalanceChild } from "./Balance";

// TODO Re-enable after new STProver
describe.skip("block production", () => {
  let runtime: Runtime<
    { Balances: typeof Balances } & { Balances: typeof BalanceChild }
  >;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let protocol: Protocol<
    MandatoryProtocolModulesRecord & {
      TransactionFee: typeof TransactionFeeHook;
    }
  >;

  let blockTrigger: ManualBlockTrigger;

  let appchain: AppChain<any, any, any, any>;

  const tokenId = TokenId.from(0);

  beforeEach(async () => {
    // container.reset();

    log.setLevel(log.levels.INFO);

    const app = TestingAppChain.fromRuntime({
      Balances: BalanceChild,
    });

    app.configurePartial({
      Runtime: {
        Balances: {},
      },
    });

    // Start AppChain
    await app.start(container.createChildContainer());
    appchain = app;

    ({ runtime, protocol } = app);

    const { sequencer } = app;
    blockTrigger = sequencer.resolve("BlockTrigger");
  });

  it("stateproof test", async () => {
    log.setLevel("INFO");

    const sender = (appchain.resolve("Signer") as InMemorySigner).config.signer;
    const senderAddress = sender.toPublicKey();

    const store =
      appchain.sequencer.dependencyContainer.resolve<AsyncMerkleTreeStore>(
        "AsyncMerkleStore"
      );

    const tx = await appchain.transaction(senderAddress, async () => {
      runtime
        .resolve("Balances")
        .setBalance(tokenId, senderAddress, UInt64.from(100));
    });
    await tx.sign();
    await tx.send();

    const [block] = await blockTrigger.produceBlock();

    expectDefined(block);
    expect(block.transactions).toHaveLength(1);

    const path = runtime
      .resolve("Balances")
      .balances.getPath(new BalancesKey({ tokenId, address: senderAddress }));

    const cmt = new CachedMerkleTreeStore(store);
    await cmt.preloadKey(path.toBigInt());
    const tree2 = new RollupMerkleTree(cmt);
    const witness = tree2.getWitness(path.toBigInt());

    console.log(tree2.getNode(0, path.toBigInt()).toBigInt());

    const hash = witness.calculateRoot(tree2.getNode(0, path.toBigInt()));

    const tx2 = await appchain.transaction(senderAddress, async () => {
      await runtime.resolve("Balances").assertLastBlockHash(hash);
    });
    await tx2.sign();
    await tx2.send();

    const [block2] = await blockTrigger.produceBlock();

    expectDefined(block2);

    expect(block2.transactions).toHaveLength(1);
    expect(block2!.transactions[0].status.toBoolean()).toBe(true);
  }, 60000);

  it("should produce a valid block", async () => {
    expect.assertions(3);

    const sender = (appchain.resolve("Signer") as InMemorySigner).config.signer;

    const tx = await appchain.transaction(sender.toPublicKey(), async () => {
      await runtime
        .resolve("Balances")
        .assertLastBlockHash(Field(RollupMerkleTree.EMPTY_ROOT));
    });
    await tx.sign();
    await tx.send();

    const [block, batch] = await blockTrigger.produceBlock();
    expect(block!.transactions[0].status.toBoolean()).toBe(true);

    expectDefined(batch);
    const publicOutput = BlockProverPublicOutput.fromFields(
      batch.proof.publicOutput.map((x) => Field(x))
    );

    const tx2 = await appchain.transaction(sender.toPublicKey(), async () => {
      await runtime
        .resolve("Balances")
        .assertLastBlockHash(publicOutput.stateRoot);
    });

    await tx2.sign();
    await tx2.send();

    const [block2, batch2] = await blockTrigger.produceBlock();
    expect(block2!.transactions[0].status.toBoolean()).toBe(true);

    expectDefined(batch2);
    const publicOutput2 = BlockProverPublicOutput.fromFields(
      batch2.proof.publicOutput.map((x) => Field(x))
    );

    const tx3 = await appchain.transaction(sender.toPublicKey(), async () => {
      await runtime
        .resolve("Balances")
        .assertLastBlockHash(publicOutput2.stateRoot);
    });

    await tx3.sign();
    await tx3.send();

    const [block3] = await blockTrigger.produceBlock();
    expect(block3!.transactions[0].status.toBoolean()).toBe(false);
  }, 30000);
});
