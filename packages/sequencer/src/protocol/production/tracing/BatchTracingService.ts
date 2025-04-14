import { log, yieldSequential } from "@proto-kit/common";
import {
  AppliedBatchHashList,
  MinaActionsHashList,
  TransactionHashList,
  WitnessedRootHashList,
} from "@proto-kit/protocol";
import { inject, injectable } from "tsyringe";

import { StateTransitionProofParameters } from "../tasks/StateTransitionTask";
import { BlockWithResult } from "../../../storage/model/Block";
import { trace } from "../../../logging/trace";
import { Tracer } from "../../../logging/Tracer";
import { CachedLinkedLeafStore } from "../../../state/lmt/CachedLinkedLeafStore";

import {
  BlockTrace,
  BlockTracingService,
  BlockTracingState,
} from "./BlockTracingService";
import { StateTransitionTracingService } from "./StateTransitionTracingService";

type BatchTracingState = Omit<BlockTracingState, "transactionList">;

export type BatchTrace = {
  blocks: BlockTrace[];
  stateTransitionTrace: StateTransitionProofParameters[];
};

@injectable()
export class BatchTracingService {
  public constructor(
    private readonly blockTracingService: BlockTracingService,
    private readonly stateTransitionTracingService: StateTransitionTracingService,
    @inject("Tracer")
    public readonly tracer: Tracer
  ) {}

  private createBatchState(block: BlockWithResult): BatchTracingState {
    return {
      pendingSTBatches: new AppliedBatchHashList(),
      witnessedRoots: new WitnessedRootHashList(),
      stateRoot: block.block.fromStateRoot,
      eternalTransactionsList: new TransactionHashList(
        block.block.fromEternalTransactionsHash
      ),
      incomingMessages: new MinaActionsHashList(block.block.fromMessagesHash),
      networkState: block.block.networkState.before,
    };
  }

  @trace("batch.trace.blocks")
  public async traceBlocks(blocks: BlockWithResult[]) {
    log.debug(`Tracing ${blocks.length} blocks...`);

    const batchState = this.createBatchState(blocks[0]);

    // Trace blocks
    const numBlocks = blocks.length;
    const [, blockTraces] = await yieldSequential(
      blocks,
      async (state, block, index) => {
        const blockProverState: BlockTracingState = {
          ...state,
          transactionList: new TransactionHashList(),
        };
        const [newState, blockTrace] =
          await this.blockTracingService.traceBlock(
            blockProverState,
            block,
            index === numBlocks - 1
          );
        return [newState, blockTrace];
      },
      batchState
    );

    return blockTraces;
  }

  @trace("batch.trace.transitions")
  public async traceStateTransitions(
    blocks: BlockWithResult[],
    merkleTreeStore: CachedLinkedLeafStore
  ) {
    const batches = await this.tracer.trace(
      "batch.trace.transitions.encoding",
      async () => this.stateTransitionTracingService.extractSTBatches(blocks)
    );

    return await this.stateTransitionTracingService.createMerkleTrace(
      merkleTreeStore,
      batches
    );
  }

  @trace("batch.trace", ([, , batchId]) => ({ batchId }))
  public async traceBatch(
    blocks: BlockWithResult[],
    merkleTreeStore: CachedLinkedLeafStore,
    // Only for trace metadata
    batchId: number
  ): Promise<BatchTrace> {
    if (blocks.length === 0) {
      return { blocks: [], stateTransitionTrace: [] };
    }

    // Traces the STs and the blocks in parallel, however not in separate processes
    // Therefore, we only optimize the idle time for async operations like DB reads
    const [blockTraces, stateTransitionTrace] = await Promise.all([
      // Trace blocks
      this.traceBlocks(blocks),
      // Trace STs
      this.traceStateTransitions(blocks, merkleTreeStore),
    ]);

    return {
      blocks: blockTraces,
      stateTransitionTrace,
    };
  }
}
