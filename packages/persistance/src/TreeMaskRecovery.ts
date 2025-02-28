import { inject, injectable } from "tsyringe";
import {
  applyStateDiff,
  assertBlockHasResult,
  AsyncMerkleTreeStore,
  BlockQueue,
  BlockWithResult,
  CachedMerkleTreeStore,
  collectStateDiff,
  MaskName,
  TreeStoreCreator,
} from "@proto-kit/sequencer";
import { reduceSequential } from "@proto-kit/common";

@injectable()
export class TreeMaskRecovery {
  public constructor(
    @inject("BlockQueue")
    private readonly blockQueue: BlockQueue,
    @inject("TreeStoreCreator")
    private readonly treeStoreCreator: TreeStoreCreator
  ) {}

  /**
   * Strategy:
   * 1. Collect all STs
   * 2. Collect a distinct diff of all to-values (state diff)
   * 3. Iteratively apply that to the tree
   */
  private async applyBlock(mask: AsyncMerkleTreeStore, block: BlockWithResult) {
    const transitions = [block.block.beforeBlockStateTransitions];
    const txTransitions = block.block.transactions.flatMap((tx) =>
      tx.stateTransitions
        .filter((batch) => batch.applied)
        .map((batch) => batch.stateTransitions)
    );
    transitions.push(...txTransitions);
    transitions.push(block.result.afterBlockStateTransitions);

    const stateDiff = collectStateDiff(transitions.flat());
    const cache = new CachedMerkleTreeStore(mask);

    await applyStateDiff(cache, stateDiff);

    await cache.mergeIntoParent();
  }

  /**
   * This method fetches all pending (i.e. un-batched) blocks and recreates
   * their in-memory tree masks.
   *
   * The crash might have happened between block production and result generation.
   * In this case, we need to first recreate all earlier masks, then generate the result.
   * The last part happens automatically in BlockProducerModule.start().
   * However, since normal block production doesn't do any tree ops, we can skip
   * that potential incomplete block altogether.
   */
  public async recreateMasks() {
    const blocks = await this.blockQueue.getPendingBlocks();

    await reduceSequential(
      blocks,
      async (previousMask, block) => {
        if (previousMask === undefined) {
          throw new Error(
            "More than one result missing for the recent blocks, something is wrong"
          );
        }
        if (block.result !== undefined) {
          const maskName = MaskName.block(block.block.height);
          const mask = await this.treeStoreCreator.createMask(
            maskName,
            previousMask
          );

          assertBlockHasResult(block);

          await this.applyBlock(mask, block);

          return maskName;
        }
        return undefined;
      },
      MaskName.base() as string | undefined
    );
  }
}
