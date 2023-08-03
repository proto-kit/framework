import { inject } from "tsyringe";
import {
  AsyncMerkleTreeStore,
  BlockProverPublicInput,
  BlockProverPublicOutput,
  CachedMerkleTreeStore,
  DefaultProvableHashList,
  noop,
} from "@yab/protocol";
import { Field, Proof } from "snarkyjs";
import { log, requireTrue } from "@yab/common";

import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { Mempool } from "../../mempool/Mempool";
import { PendingTransaction } from "../../mempool/PendingTransaction";
import { BaseLayer } from "../baselayer/BaseLayer";
import { BlockStorage } from "../../storage/repositories/BlockStorage";
import { ComputedBlock } from "../../storage/model/Block";

import { AsyncStateService } from "./state/AsyncStateService";
import { CachedStateService } from "./execution/CachedStateService";
import { StateTransitionProofParameters } from "./tasks/StateTransitionTaskParameters";
import { RuntimeProofParameters } from "./tasks/RuntimeTaskParameters";
import { TransactionTraceService } from "./TransactionTraceService";
import { BlockTaskFlowService } from "./BlockTaskFlowService";

export interface StateRecord {
  [key: string]: Field[] | undefined;
}

export interface TransactionTrace {
  runtimeProver: RuntimeProofParameters;
  stateTransitionProver: StateTransitionProofParameters;
  blockProver: BlockProverPublicInput;
}

interface ComputedBlockMetadata {
  block: ComputedBlock;
  stateService: CachedStateService;
  merkleStore: CachedMerkleTreeStore;
}

const errors = {
  txRemovalFailed: () => new Error("Removal of txs from mempool failed"),
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
export class BlockProducerModule extends SequencerModule<object> {
  private productionInProgress = false;

  // eslint-disable-next-line max-params
  public constructor(
    @inject("Mempool") private readonly mempool: Mempool,
    @inject("AsyncStateService")
    private readonly asyncStateService: AsyncStateService,
    @inject("AsyncMerkleStore")
    private readonly merkleStore: AsyncMerkleTreeStore,
    @inject("BaseLayer") private readonly baseLayer: BaseLayer,
    @inject("BlockStorage") private readonly blockStorage: BlockStorage,
    private readonly traceService: TransactionTraceService,
    private readonly blockFlowService: BlockTaskFlowService
  ) {
    super();
  }

  private async applyStateChanges(block: ComputedBlockMetadata) {
    await block.stateService.mergeIntoParent();
    await block.merkleStore.mergeIntoParent();
  }

  /**
   * Main function to call when wanting to create a new block based on the
   * transactions that are present in the mempool. This function should also
   * be the one called by BlockTriggers
   */
  public async createBlock(): Promise<ComputedBlock | undefined> {
    log.info("Producing batch...");

    const block = await this.tryProduceBlock();

    if (block !== undefined) {
      log.debug("Batch produced");
      // Apply state changes to current StateService
      await this.applyStateChanges(block);

      // Mock for now
      await this.blockStorage.setBlockHeight(
        (await this.blockStorage.getCurrentBlockHeight()) + 1
      );

      // Broadcast result on to baselayer
      await this.baseLayer.blockProduced(block.block);
      log.info("Batch submitted onto baselayer");
    }
    return block?.block;
  }

  public async start(): Promise<void> {
    noop();
  }

  private async tryProduceBlock(): Promise<ComputedBlockMetadata | undefined> {
    if (!this.productionInProgress) {
      return await this.produceBlock();
    }
    return undefined;
  }

  private async produceBlock(): Promise<ComputedBlockMetadata> {
    this.productionInProgress = true;

    // Get next blockheight and therefore taskId
    const lastHeight = await this.blockStorage.getCurrentBlockHeight();

    const { txs } = this.mempool.getTxs();

    const block = await this.computeBlock(txs, lastHeight + 1);

    requireTrue(this.mempool.removeTxs(txs), errors.txRemovalFailed);

    this.productionInProgress = false;

    return {
      block: {
        proof: block.proof,
        txs,
      },

      stateService: block.stateSerivce,
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
    txs: PendingTransaction[],
    blockId: number
  ): Promise<{
    proof: Proof<BlockProverPublicInput, BlockProverPublicOutput>;
    stateSerivce: CachedStateService;
    merkleStore: CachedMerkleTreeStore;
  }> {
    const stateServices = {
      stateService: new CachedStateService(this.asyncStateService),
      merkleStore: new CachedMerkleTreeStore(this.merkleStore),
    };

    const bundleTracker = new DefaultProvableHashList(Field);

    const traces = await Promise.all(
      txs.map(
        async (tx) =>
          await this.traceService.createTrace(tx, stateServices, bundleTracker)
      )
    );

    const proof = await this.blockFlowService.executeBlockCreation(
      traces,
      blockId
    );

    return {
      proof,
      stateSerivce: stateServices.stateService,
      merkleStore: stateServices.merkleStore,
    };
  }
}
