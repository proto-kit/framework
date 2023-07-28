/* eslint-disable max-lines */
import { inject } from "tsyringe";
import {
  AsyncMerkleTreeStore,
  BlockProverPublicInput,
  BlockProverPublicOutput,
  CachedMerkleTreeStore,
  DefaultProvableHashList,
} from "@yab/protocol";
import { Field, Proof } from "snarkyjs";
import { requireTrue } from "@yab/common";

import { sequencerModule, SequencerModule } from "../../sequencer/builder/SequencerModule";
import { Mempool } from "../../mempool/Mempool";
import { PendingTransaction } from "../../mempool/PendingTransaction";
import { BaseLayer } from "../baselayer/BaseLayer";
import { BlockStorage } from "../../storage/repositories/BlockStorage";
import { ComputedBlock } from "../../storage/model/Block";

import { BlockTrigger } from "./trigger/BlockTrigger";
import { AsyncStateService } from "./state/AsyncStateService";
import { CachedStateService } from "./execution/CachedStateService";
import { StateTransitionProofParameters } from "./tasks/StateTransitionTaskParameters";
import { RuntimeProofParameters } from "./tasks/RuntimeTaskParameters";
import { TransactionTraceService } from "./TransactionTraceService";
import { BlockTaskFlowService } from "./BlockTaskFlowService";

interface RuntimeSequencerModuleConfig {
  proofsEnabled: boolean;
}

export interface StateRecord {
  [key: string]: Field[] | undefined;
}

export interface TransactionTrace {
  runtimeProver: RuntimeProofParameters;
  stateTransitionProver: StateTransitionProofParameters;
  blockProver: BlockProverPublicInput;
}

const errors = {
  publicInputUndefined: () =>
    new Error("Public Input undefined, something went wrong during execution"),

  txRemovalFailed: () => new Error("Removal of txs from mempool failed"),
};

@sequencerModule()
export class BlockProducerModule extends SequencerModule<RuntimeSequencerModuleConfig> {
  private productionInProgress = false;

  // eslint-disable-next-line max-params
  public constructor(
    @inject("Mempool") private readonly mempool: Mempool,
    @inject("BlockTrigger") private readonly blockTrigger: BlockTrigger,
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

  public async start(): Promise<void> {
    // this.runtime.setProofsEnabled(this.config.proofsEnabled);

    this.blockTrigger.setProduceBlock(
      async (): Promise<ComputedBlock | undefined> => {
        console.log("Producing batch...");
        const block = await this.tryProduceBlock();
        if (block !== undefined) {
          console.log("Batch produced");
          // Broadcast result on to baselayer
          await this.baseLayer.blockProduced(block);
          console.log("Batch submitted onto baselayer");
        }
        return block;
      }
    );

    // TODO Remove that probably, otherwise .start() will be called twice on that module
    await this.blockTrigger.start();

    console.log("Blocktrigger set");
  }

  public async tryProduceBlock(): Promise<ComputedBlock | undefined> {
    if (!this.productionInProgress) {
      return await this.produceBlock();
    }
    return undefined;
  }

  public async produceBlock(): Promise<ComputedBlock> {
    this.productionInProgress = true;

    // Get next blockheight and therefore taskId
    const lastHeight = await this.blockStorage.getCurrentBlockHeight();

    const { txs } = this.mempool.getTxs();

    const proof = await this.createBlock(txs, lastHeight + 1);

    requireTrue(this.mempool.removeTxs(txs), errors.txRemovalFailed);

    return {
      proof,
      txs,
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
  public async createBlock(
    txs: PendingTransaction[],
    blockId: number
  ): Promise<Proof<BlockProverPublicInput, BlockProverPublicOutput>> {
    const stateServices = {
      stateService: new CachedStateService(this.asyncStateService),
      merkleStore: new CachedMerkleTreeStore(this.merkleStore),
    };

    const bundleTracker = new DefaultProvableHashList(Field);

    const traces = await Promise.all(
      txs.map(
        async (tx) => await this.traceService.createTrace(tx, stateServices, bundleTracker)
      )
    );

    return await this.blockFlowService.executeBlockCreation(traces, blockId);
  }
}
