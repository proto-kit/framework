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
import { BlockStorage } from "../../storage/repositories/BlockStorage";
import { SettleableBatch } from "../../storage/model/Block";
import { CachedStateService } from "../../state/state/CachedStateService";
import { CachedMerkleTreeStore } from "../../state/merkle/CachedMerkleTreeStore";
import { AsyncStateService } from "../../state/async/AsyncStateService";
import { AsyncMerkleTreeStore } from "../../state/async/AsyncMerkleTreeStore";
import {
  UnprovenBlock,
  UnprovenBlockMetadata,
  UnprovenBlockWithMetadata,
} from "../../storage/model/UnprovenBlock";

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

export interface UnprovenBlockWithPreviousMetadata {
  block: UnprovenBlockWithMetadata;
  lastBlockMetadata?: UnprovenBlockMetadata;
}

interface ComputedBlockMetadata {
  block: SettleableBatch;
  stateService: CachedStateService;
  merkleStore: CachedMerkleTreeStore;
}

const errors = {
  blockWithoutTxs: () =>
    new Error("Can't create a block with zero transactions"),
};

/**
 * The BlockProducerModule has the resposiblity to oversee the block production
 * and combine all necessary parts for that to happen. The flow roughly follows
 * the following steps:
 *
 * 1. BlockTrigger triggers and executes the startup function
 * 2.
 */
@sequencerModule()
export class BlockProducerModule extends SequencerModule {
  private productionInProgress = false;

  public constructor(
    @inject("AsyncStateService")
    private readonly asyncStateService: AsyncStateService,
    @inject("AsyncMerkleStore")
    private readonly merkleStore: AsyncMerkleTreeStore,
    @inject("BlockStorage") private readonly blockStorage: BlockStorage,
    @inject("BlockTreeStore")
    private readonly blockTreeStore: AsyncMerkleTreeStore,
    private readonly traceService: TransactionTraceService,
    private readonly blockFlowService: BlockTaskFlowService,
    private readonly blockProofSerializer: BlockProofSerializer
  ) {
    super();
  }

  private async applyStateChanges(
    unprovenBlocks: UnprovenBlock[],
    block: ComputedBlockMetadata
  ) {
    await block.stateService.mergeIntoParent();
    await block.merkleStore.mergeIntoParent();
  }

  /**
   * Main function to call when wanting to create a new block based on the
   * transactions that are present in the mempool. This function should also
   * be the one called by BlockTriggers
   */
  public async createBlock(
    unprovenBlocks: UnprovenBlockWithPreviousMetadata[]
  ): Promise<SettleableBatch | undefined> {
    log.info("Producing batch...");

    const height = await this.blockStorage.getCurrentBlockHeight();

    const blockWithStateDiff = await this.tryProduceBlock(
      unprovenBlocks,
      height
    );

    if (blockWithStateDiff !== undefined) {
      log.info(
        `Batch produced (${blockWithStateDiff.block.bundles.length} bundles, ${
          blockWithStateDiff.block.bundles.flat(1).length
        } txs)`
      );
      // Apply state changes to current StateService
      await this.applyStateChanges(
        unprovenBlocks.map((data) => data.block.block),
        blockWithStateDiff
      );
    }
    return blockWithStateDiff?.block;
  }

  public async start(): Promise<void> {
    noop();
  }

  private async tryProduceBlock(
    unprovenBlocks: UnprovenBlockWithPreviousMetadata[],
    height: number
  ): Promise<ComputedBlockMetadata | undefined> {
    if (!this.productionInProgress) {
      try {
        this.productionInProgress = true;

        const block = await this.produceBlock(unprovenBlocks, height);

        this.productionInProgress = false;

        return block;
      } catch (error: unknown) {
        this.productionInProgress = false;
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

  private async produceBlock(
    unprovenBlocks: UnprovenBlockWithPreviousMetadata[],
    height: number
  ): Promise<ComputedBlockMetadata | undefined> {
    const block = await this.computeBlock(unprovenBlocks, height);

    const computedBundles = unprovenBlocks.map((bundle) =>
      bundle.block.block.hash.toString()
    );

    const jsonProof = this.blockProofSerializer
      .getBlockProofSerializer()
      .toJSONProof(block.proof);

    return {
      block: {
        proof: jsonProof,
        bundles: computedBundles,
        height,
        fromNetworkState: block.fromNetworkState,
        toNetworkState: block.toNetworkState,
      },

      stateService: block.stateService,
      merkleStore: block.merkleStore,
    };
  }

  /**
   * Very naive impl for now
   *
   * How we produce Blocks (batches):
   *
   * 1. We get all pending txs from the mempool and define an order
   * 2. We execute them to get results / intermediate state-roots.
   * We define a tuple of (tx data (methodId, args), state-input, state-output)
   * as a "tx trace"
   * 3. We create tasks based on those traces
   *
   */

  private async computeBlock(
    bundles: UnprovenBlockWithPreviousMetadata[],
    blockId: number
  ): Promise<{
    proof: Proof<BlockProverPublicInput, BlockProverPublicOutput>;
    stateService: CachedStateService;
    merkleStore: CachedMerkleTreeStore;
    fromNetworkState: NetworkState;
    toNetworkState: NetworkState;
  }> {
    if (bundles.length === 0 || bundles.flat(1).length === 0) {
      throw errors.blockWithoutTxs();
    }

    const stateServices = {
      stateService: new CachedStateService(this.asyncStateService),
      merkleStore: new CachedMerkleTreeStore(this.merkleStore),
    };

    const blockTraces: BlockTrace[] = [];

    const eternalBundleTracker = new DefaultProvableHashList(
      Field,
      bundles[0].block.block.fromEternalTransactionsHash
    );
    const messageTracker = new MinaPrefixedProvableHashList(
      Field,
      MINA_EVENT_PREFIXES.sequenceEvents,
      bundles[0].block.block.fromMessagesHash
    );

    for (const bundleWithMetadata of bundles) {
      const { block } = bundleWithMetadata.block;
      const txs = block.transactions;

      const bundleTracker = new DefaultProvableHashList(Field);

      const transactionTraces: TransactionTrace[] = [];

      for (const [, tx] of txs.entries()) {
        // eslint-disable-next-line no-await-in-loop
        const result = await this.traceService.createTransactionTrace(
          tx,
          stateServices,
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
          bundleWithMetadata.lastBlockMetadata?.stateRoot ??
            RollupMerkleTree.EMPTY_ROOT
        ),
        bundleWithMetadata.block
      );
      blockTraces.push(blockTrace);
    }

    const proof = await this.blockFlowService.executeFlow(blockTraces, blockId);

    const fromNetworkState = bundles[0].block.block.networkState.before;
    const toNetworkState = bundles.at(-1)!.block.metadata.afterNetworkState;

    return {
      proof,
      stateService: stateServices.stateService,
      merkleStore: stateServices.merkleStore,
      fromNetworkState,
      toNetworkState,
    };
  }
}
