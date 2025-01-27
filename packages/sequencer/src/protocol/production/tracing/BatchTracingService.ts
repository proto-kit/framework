import { yieldSequential } from "@proto-kit/common";
import {
  AppliedBatchHashList,
  MinaActionsHashList,
  TransactionHashList,
  WitnessedRootHashList,
} from "@proto-kit/protocol";
import { Field } from "o1js";
import { injectable } from "tsyringe";

import { CachedMerkleTreeStore } from "../../../state/merkle/CachedMerkleTreeStore";
import { StateTransitionProofParameters } from "../tasks/StateTransitionTask";
import { BlockWithResult } from "../../../storage/model/Block";

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
    private readonly stateTransitionTracingService: StateTransitionTracingService
  ) {}

  private createBatchState(block: BlockWithResult): BatchTracingState {
    return {
      pendingSTBatches: new AppliedBatchHashList(),
      witnessedRoots: new WitnessedRootHashList(),
      stateRoot: Field(block.block.fromStateRoot),
      eternalTransactionsList: new TransactionHashList(
        block.block.fromEternalTransactionsHash
      ),
      incomingMessages: new MinaActionsHashList(block.block.fromMessagesHash),
      networkState: block.block.networkState.before,
    };
  }

  public async traceBlocks(blocks: BlockWithResult[]) {
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
        const [newState, trace] = await this.blockTracingService.traceBlock(
          blockProverState,
          block,
          index === numBlocks - 1
        );
        return [newState, trace];
      },
      batchState
    );

    return blockTraces;
  }

  public async traceStateTransitions(
    blocks: BlockWithResult[],
    merkleTreeStore: CachedMerkleTreeStore
  ) {
    const batches = this.stateTransitionTracingService.extractSTBatches(blocks);

    return await this.stateTransitionTracingService.createMerkleTrace(
      merkleTreeStore,
      batches
    );
  }

  public async traceBatch(
    blocks: BlockWithResult[],
    merkleTreeStore: CachedMerkleTreeStore,
    // TODO Implement and then also test
    parallel: boolean = false
  ): Promise<BatchTrace> {
    if (blocks.length === 0) {
      return { blocks: [], stateTransitionTrace: [] };
    }

    const blockTraces = await this.traceBlocks(blocks);

    // Trace STs
    const stateTransitionTrace = await this.traceStateTransitions(
      blocks,
      merkleTreeStore
    );

    return {
      blocks: blockTraces,
      stateTransitionTrace,
    };
  }
}
