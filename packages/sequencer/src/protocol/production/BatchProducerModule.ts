import { inject } from "tsyringe";
import {
  BlockProverPublicInput,
  BlockProverPublicOutput,
  DefaultProvableHashList,
  MINA_EVENT_PREFIXES,
  MinaPrefixedProvableHashList,
  NetworkState,
} from "@proto-kit/protocol";
import { Field, Proof } from "o1js";
import { log, noop, RollupMerkleTree } from "@proto-kit/common";

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
import { BlockResult, BlockWithResult } from "../../storage/model/Block";
import { VerificationKeyService } from "../runtime/RuntimeVerificationKeyService";
import type { Database } from "../../storage/Database";

import { BlockProverParameters } from "./tasks/BlockProvingTask";
import { StateTransitionProofParameters } from "./tasks/StateTransitionTaskParameters";
import { RuntimeProofParameters } from "./tasks/RuntimeTaskParameters";
import { TransactionTraceService } from "./TransactionTraceService";
import { BlockTaskFlowService } from "./BlockTaskFlowService";
import { NewBlockProverParameters } from "./tasks/NewBlockTask";
import { BlockProofSerializer } from "./helpers/BlockProofSerializer";

export type StateRecord = Record<string, Field[] | undefined>;

export interface TransactionTrace {
  runtimeProver: RuntimeProofParameters;
  stateTransitionProver: StateTransitionProofParameters[];
  blockProver: BlockProverParameters;
}

export interface BlockTrace {
  block: NewBlockProverParameters;
  stateTransitionProver: StateTransitionProofParameters[];
  transactions: TransactionTrace[];
}

export interface BlockWithPreviousResult {
  block: BlockWithResult;
  lastBlockResult?: BlockResult;
}

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
    @inject("BlockTreeStore")
    private readonly blockTreeStore: AsyncMerkleTreeStore,
    @inject("Database")
    private readonly database: Database,
    private readonly traceService: TransactionTraceService,
    private readonly blockFlowService: BlockTaskFlowService,
    private readonly blockProofSerializer: BlockProofSerializer,
    private readonly verificationKeyService: VerificationKeyService
  ) {
    super();
  }

  private async applyStateChanges(batch: BatchMetadata) {
    // TODO Introduce Proven and Unproven BlockHashTree stores - for rollbacks
    await this.database.executeInTransaction(async () => {
      await batch.stateService.mergeIntoParent();
      await batch.merkleStore.mergeIntoParent();
    });
  }

  /**
   * Main function to call when wanting to create a new block based on the
   * transactions that are present in the mempool. This function should also
   * be the one called by BlockTriggers
   */
  public async createBatch(
    blocks: BlockWithPreviousResult[]
  ): Promise<SettleableBatch | undefined> {
    log.info("Producing batch...");

    const height = await this.batchStorage.getCurrentBatchHeight();

    const batchWithStateDiff = await this.tryProduceBatch(blocks, height);

    if (batchWithStateDiff !== undefined) {
      const numTxs = blocks.reduce(
        (sum, block) => sum + block.block.block.transactions.length,
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
    blocks: BlockWithPreviousResult[],
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
    blocks: BlockWithPreviousResult[],
    height: number
  ): Promise<BatchMetadata | undefined> {
    const batch = await this.computeBatch(blocks, height);

    const blockHashes = blocks.map((bundle) =>
      bundle.block.block.hash.toString()
    );

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
   * Very naive impl for now
   *
   * How we produce batches:
   *
   * 1. We get all pending txs from the mempool and define an order
   * 2. We execute them to get results / intermediate state-roots.
   * We define a tuple of (tx data (methodId, args), state-input, state-output)
   * as a "tx trace"
   * 3. We create tasks based on those traces
   *
   */

  private async computeBatch(
    blocks: BlockWithPreviousResult[],
    blockId: number
  ): Promise<{
    proof: Proof<BlockProverPublicInput, BlockProverPublicOutput>;
    stateService: CachedStateService;
    merkleStore: CachedMerkleTreeStore;
    fromNetworkState: NetworkState;
    toNetworkState: NetworkState;
  }> {
    if (blocks.length === 0 || blocks.flat(1).length === 0) {
      throw errors.blockWithoutTxs();
    }

    const stateServices = {
      stateService: new CachedStateService(this.asyncStateService),
      merkleStore: new CachedMerkleTreeStore(this.merkleStore),
    };

    const blockTraces: BlockTrace[] = [];

    const eternalBundleTracker = new DefaultProvableHashList(
      Field,
      blocks[0].block.block.fromEternalTransactionsHash
    );
    const messageTracker = new MinaPrefixedProvableHashList(
      Field,
      MINA_EVENT_PREFIXES.sequenceEvents,
      blocks[0].block.block.fromMessagesHash
    );

    for (const blockWithPreviousResult of blocks) {
      const { block } = blockWithPreviousResult.block;
      const txs = block.transactions;

      const bundleTracker = new DefaultProvableHashList(Field);

      const transactionTraces: TransactionTrace[] = [];

      for (const [, tx] of txs.entries()) {
        // eslint-disable-next-line no-await-in-loop
        const result = await this.traceService.createTransactionTrace(
          tx,
          stateServices,
          this.verificationKeyService,
          block.networkState.during,
          bundleTracker,
          eternalBundleTracker,
          messageTracker
        );

        transactionTraces.push(result);
      }

      // eslint-disable-next-line no-await-in-loop
      const blockTrace = await this.traceService.createBlockTrace(
        transactionTraces,
        stateServices,
        this.blockTreeStore,
        Field(
          blockWithPreviousResult.lastBlockResult?.stateRoot ??
            RollupMerkleTree.EMPTY_ROOT
        ),
        blockWithPreviousResult.block
      );
      blockTraces.push(blockTrace);
    }

    const proof = await this.blockFlowService.executeFlow(blockTraces, blockId);

    const fromNetworkState = blocks[0].block.block.networkState.before;
    const toNetworkState = blocks.at(-1)!.block.result.afterNetworkState;

    return {
      proof,
      stateService: stateServices.stateService,
      merkleStore: stateServices.merkleStore,
      fromNetworkState,
      toNetworkState,
    };
  }
}
