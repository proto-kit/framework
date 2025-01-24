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
import { CachedStateService } from "../../state/state/CachedStateService";
import { CachedMerkleTreeStore } from "../../state/merkle/CachedMerkleTreeStore";
import { AsyncStateService } from "../../state/async/AsyncStateService";
import { AsyncMerkleTreeStore } from "../../state/async/AsyncMerkleTreeStore";
import { BlockWithResult } from "../../storage/model/Block";

import { BlockProofSerializer } from "./tasks/serializers/BlockProofSerializer";
import { BatchTracingService } from "./tracing/BatchTracingService";
import { BatchFlow } from "./flow/BatchFlow";

export type StateRecord = Record<string, Field[] | undefined>;

interface BatchMetadata {
  batch: SettleableBatch;
  stateService: CachedStateService;
  merkleStore: CachedMerkleTreeStore;
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
    @inject("AsyncStateService")
    private readonly asyncStateService: AsyncStateService,
    @inject("AsyncMerkleStore")
    private readonly merkleStore: AsyncMerkleTreeStore,
    @inject("BatchStorage") private readonly batchStorage: BatchStorage,
    private readonly batchFlow: BatchFlow,
    private readonly blockProofSerializer: BlockProofSerializer,
    private readonly batchTraceService: BatchTracingService
  ) {
    super();
  }

  private async applyStateChanges(batch: BatchMetadata) {
    await batch.stateService.mergeIntoParent();
    await batch.merkleStore.mergeIntoParent();
  }

  /**
   * Main function to call when wanting to create a new block based on the
   * transactions that are present in the mempool. This function should also
   * be the one called by BlockTriggers
   */
  public async createBatch(
    blocks: BlockWithResult[]
  ): Promise<SettleableBatch | undefined> {
    log.info("Producing batch...");

    const height = await this.batchStorage.getCurrentBatchHeight();

    const batchWithStateDiff = await this.tryProduceBatch(blocks, height);

    if (batchWithStateDiff !== undefined) {
      const numTxs = blocks.reduce(
        (sum, block) => sum + block.block.transactions.length,
        0
      );
      log.info(
        `Batch produced (${batchWithStateDiff.batch.blockHashes.length} blocks, ${numTxs} txs)`
      );

      // Apply state changes to current StateService
      await this.applyStateChanges(batchWithStateDiff);
    }
    return batchWithStateDiff?.batch;
  }

  public async start(): Promise<void> {
    noop();
  }

  private async tryProduceBatch(
    blocks: BlockWithResult[],
    height: number
  ): Promise<BatchMetadata | undefined> {
    if (!this.productionInProgress) {
      try {
        this.productionInProgress = true;

        const batch = await this.produceBatch(blocks, height);

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

      stateService: batch.stateService,
      merkleStore: batch.merkleStore,
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
   * @param blockId
   * @private
   */
  private async computeBatch(
    blocks: BlockWithResult[],
    blockId: number
  ): Promise<{
    proof: Proof<BlockProverPublicInput, BlockProverPublicOutput>;
    // TODO Return State services as commit-only object
    stateService: CachedStateService;
    merkleStore: CachedMerkleTreeStore;
    fromNetworkState: NetworkState;
    toNetworkState: NetworkState;
  }> {
    if (blocks.length === 0 || blocks.flat(1).length === 0) {
      throw errors.blockWithoutTxs();
    }

    const stateServices = {
      // TODO Remove stateService
      stateService: new CachedStateService(this.asyncStateService),
      merkleTreeStore: new CachedMerkleTreeStore(this.merkleStore),
    };

    const trace = await this.batchTraceService.traceBatch(
      blocks.map((block) => block),
      stateServices
    );

    const proof = await this.batchFlow.executeBatch(trace, blockId);

    const fromNetworkState = blocks[0].block.networkState.before;
    const toNetworkState = blocks.at(-1)!.result.afterNetworkState;

    return {
      proof,
      stateService: stateServices.stateService,
      merkleStore: stateServices.merkleTreeStore,
      fromNetworkState,
      toNetworkState,
    };
  }
}
