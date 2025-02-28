import { inject } from "tsyringe";
import {
  BlockProverPublicInput,
  BlockProverPublicOutput,
  NetworkState,
} from "@proto-kit/protocol";
import { Field, Proof } from "o1js";
import { log, mapSequential, noop, RollupMerkleTree } from "@proto-kit/common";

import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { BatchStorage } from "../../storage/repositories/BatchStorage";
import { SettleableBatch } from "../../storage/model/Batch";
import { CachedMerkleTreeStore } from "../../state/merkle/CachedMerkleTreeStore";
import { BlockWithResult } from "../../storage/model/Block";
import type { Database } from "../../storage/Database";
import { TreeStoreCreator } from "../../state/masking/TreeStoreCreator";

import { BlockProofSerializer } from "./tasks/serializers/BlockProofSerializer";
import { BatchTracingService } from "./tracing/BatchTracingService";
import { BatchFlow } from "./flow/BatchFlow";

export type StateRecord = Record<string, Field[] | undefined>;

interface BatchMetadata {
  batch: SettleableBatch;
  changes: CachedMerkleTreeStore;
}

const errors = {
  blockWithoutTxs: () =>
    new Error("Can't create a block with zero transactions"),
};

/**
 * The BatchProducerModule has the resposiblity to oversee the block production
 * and combine all necessary parts for that to happen. The flow roughly follows
 * the following steps:
 *
 * 1. BlockTrigger triggers and executes the startup function
 * 2.
 */
@sequencerModule()
export class BatchProducerModule extends SequencerModule {
  private productionInProgress = false;

  public constructor(
    @inject("TreeStoreCreator")
    private readonly treeStoreCreator: TreeStoreCreator,
    @inject("BatchStorage") private readonly batchStorage: BatchStorage,
    @inject("Database")
    private readonly database: Database,
    private readonly batchFlow: BatchFlow,
    private readonly blockProofSerializer: BlockProofSerializer,
    private readonly batchTraceService: BatchTracingService
  ) {
    super();
  }

  /**
   * Main function to call when wanting to create a new block based on the
   * transactions that are present in the mempool. This function should also
   * be the one called by BlockTriggerss
   */
  public async createBatch(
    blocks: BlockWithResult[]
  ): Promise<SettleableBatch | undefined> {
    if (!this.productionInProgress) {
      try {
        this.productionInProgress = true;

        const batch = await this.tryProduceBatch(blocks);

        this.productionInProgress = false;

        return batch;
      } catch (error: unknown) {
        this.productionInProgress = false;
        // TODO Check if that still makes sense
        if (error instanceof Error) {
          if (
            !error.message.includes(
              "Can't create a block with zero transactions"
            )
          ) {
            log.error(error);
          }

          throw error;
        } else {
          log.error(error);
        }
      }
    } else {
      log.debug(
        "Skipping new block production because production is still in progress"
      );
    }
    return undefined;
  }

  private async mergeBatchIntoStorage(blocks: BlockWithResult[]) {
    // Reverse, so that we merge from latest block to oldest. This way,
    // nodes that have been written in multiple masks are only written to
    // the base once, therefore implicitly deduped
    await mapSequential(blocks.slice().reverse(), async (block) => {
      const mask = `block-${block.block.height.toBigInt()}`;
      await this.treeStoreCreator.mergeIntoParent(mask);
    });
  }

  private async tryProduceBatch(
    blocks: BlockWithResult[]
  ): Promise<SettleableBatch | undefined> {
    log.info("Producing batch...");

    const height = await this.batchStorage.getCurrentBatchHeight();

    const batchWithStateDiff = await this.produceBatch(blocks, height);

    if (batchWithStateDiff !== undefined) {
      const numTxs = blocks.reduce(
        (sum, block) => sum + block.block.transactions.length,
        0
      );
      log.info(
        `Batch produced (${batchWithStateDiff.batch.blockHashes.length} blocks, ${numTxs} txs)`
      );

      // Apply state changes to current MerkleTreeStore
      await this.database.executeInTransaction(async () => {
        await this.batchStorage.pushBatch(batchWithStateDiff.batch);

        await this.mergeBatchIntoStorage(blocks);
      });

      // TODO Add transition from unproven to proven state for stateservice
      //  This needs proper DB-level masking
    }
    return batchWithStateDiff?.batch;
  }

  public async start(): Promise<void> {
    noop();
  }

  private async produceBatch(
    blocks: BlockWithResult[],
    height: number
  ): Promise<BatchMetadata | undefined> {
    const batch = await this.computeBatch(blocks, height);

    const blockHashes = blocks.map((bundle) => bundle.block.hash.toString());

    const jsonProof = this.blockProofSerializer
      .getBlockProofSerializer()
      .toJSONProof(batch.proof);

    return {
      batch: {
        proof: jsonProof,
        blockHashes,
        height,
        fromNetworkState: batch.fromNetworkState,
        toNetworkState: batch.toNetworkState,
      },

      changes: batch.changes,
    };
  }

  private async checkTreeConsistency(
    merkleTreeStore: CachedMerkleTreeStore,
    publicOutput: BlockProverPublicOutput
  ) {
    // Preload root
    const [fetchedRoot] = await merkleTreeStore.getNodesAsync([
      { key: 0n, level: 255 },
    ]);
    const root = fetchedRoot ?? RollupMerkleTree.EMPTY_ROOT;

    if (root !== publicOutput.stateRoot.toBigInt()) {
      throw new Error(
        `Mismatch in output state roots: ${root} != ${publicOutput.stateRoot.toBigInt()}`
      );
    }
  }

  /**
   * Computes a batch based on an array of sequenced blocks.
   * This process is also known as tracing, as we "trace" every computational step
   * into witnesses that we can use in the provers.
   *
   * The workflow of computing batches works as follows:
   *
   *
   *
   * @param blocks
   * @param blockId
   * @private
   */
  private async computeBatch(
    blocks: BlockWithResult[],
    blockId: number
  ): Promise<{
    proof: Proof<BlockProverPublicInput, BlockProverPublicOutput>;
    changes: CachedMerkleTreeStore;
    fromNetworkState: NetworkState;
    toNetworkState: NetworkState;
  }> {
    if (blocks.length === 0 || blocks.flat(1).length === 0) {
      throw errors.blockWithoutTxs();
    }

    const mask = this.treeStoreCreator.getMask("base");
    const merkleTreeStore = new CachedMerkleTreeStore(mask);

    const trace = await this.batchTraceService.traceBatch(
      blocks.map((block) => block),
      merkleTreeStore
    );

    const proof = await this.batchFlow.executeBatch(trace, blockId);

    await this.checkTreeConsistency(merkleTreeStore, proof.publicOutput);

    const fromNetworkState = blocks[0].block.networkState.before;
    const toNetworkState = blocks.at(-1)!.result.afterNetworkState;

    return {
      proof,
      changes: merkleTreeStore,
      fromNetworkState,
      toNetworkState,
    };
  }
}
