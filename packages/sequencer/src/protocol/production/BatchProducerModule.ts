import { inject } from "tsyringe";
import {
  BlockProverPublicInput,
  BlockProverPublicOutput,
  NetworkState,
} from "@proto-kit/protocol";
import { Field, Proof } from "o1js";
import { log, noop } from "@proto-kit/common";

import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { BatchStorage } from "../../storage/repositories/BatchStorage";
import { SettleableBatch } from "../../storage/model/Batch";
import { BlockWithResult } from "../../storage/model/Block";
import type { Database } from "../../storage/Database";
import { AsyncLinkedLeafStore } from "../../state/async/AsyncLinkedLeafStore";
import { CachedLinkedLeafStore } from "../../state/lmt/CachedLinkedLeafStore";
import { ensureNotBusy } from "../../helpers/BusyGuard";

import { BlockProofSerializer } from "./tasks/serializers/BlockProofSerializer";
import { BatchTracingService } from "./tracing/BatchTracingService";
import { BatchFlow } from "./flow/BatchFlow";

export type StateRecord = Record<string, Field[] | undefined>;

interface BatchMetadata {
  batch: SettleableBatch;
  changes: CachedLinkedLeafStore;
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
  public constructor(
    @inject("AsyncLinkedLeafStore")
    private readonly merkleStore: AsyncLinkedLeafStore,
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
  @ensureNotBusy()
  public async createBatch(
    blocks: BlockWithResult[]
  ): Promise<SettleableBatch | undefined> {
    return await this.tryProduceBatch(blocks);
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
        await batchWithStateDiff.changes.mergeIntoParent();
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
   * @param batchId
   * @private
   */
  private async computeBatch(
    blocks: BlockWithResult[],
    batchId: number
  ): Promise<{
    proof: Proof<BlockProverPublicInput, BlockProverPublicOutput>;
    changes: CachedLinkedLeafStore;
    fromNetworkState: NetworkState;
    toNetworkState: NetworkState;
  }> {
    if (blocks.length === 0 || blocks.flat(1).length === 0) {
      throw errors.blockWithoutTxs();
    }

    const merkleTreeStore = await CachedLinkedLeafStore.new(this.merkleStore);

    const trace = await this.batchTraceService.traceBatch(
      blocks.map((block) => block),
      merkleTreeStore,
      batchId
    );

    const proof = await this.batchFlow.executeBatch(trace, batchId);

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
