import { range, unzip, yieldSequential } from "@proto-kit/common";
import {
  AppliedBatchHashList,
  MinaActionsHashList,
  TransactionHashList,
  WitnessedRootHashList,
  BundleHashList,
  BlockArguments,
  ProtocolConstants,
} from "@proto-kit/protocol";
import { inject, injectable } from "tsyringe";
// eslint-disable-next-line import/no-extraneous-dependencies
import chunk from "lodash/chunk";
import { Bool, Field } from "o1js";

import { StateTransitionProofParameters } from "../tasks/StateTransitionTask";
import { BlockWithResult } from "../../../storage/model/Block";
import { trace } from "../../../logging/trace";
import { Tracer } from "../../../logging/Tracer";
import { CachedLinkedLeafStore } from "../../../state/lmt/CachedLinkedLeafStore";
import {
  NewBlockArguments,
  NewBlockProverParameters,
} from "../tasks/NewBlockTask";

import { BlockTracingService, BlockTracingState } from "./BlockTracingService";
import { StateTransitionTracingService } from "./StateTransitionTracingService";
import { TransactionTrace } from "./TransactionTracingService";

type BatchTracingState = BlockTracingState;

export type BlockTrace = {
  block: NewBlockProverParameters;
  // Only for debugging and logging
  heights: [string, string];
};

export type BatchTrace = {
  blocks: BlockTrace[];
  transactions: TransactionTrace[];
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
      bundleList: new BundleHashList(),
      stateRoot: block.block.fromStateRoot,
      eternalTransactionsList: new TransactionHashList(
        block.block.fromEternalTransactionsHash
      ),
      incomingMessages: new MinaActionsHashList(block.block.fromMessagesHash),
      networkState: block.block.networkState.before,
      blockNumber: block.block.height,
      blockHashRoot: block.block.fromBlockHashRoot,
    };
  }

  @trace("batch.trace.blocks")
  public async traceBlocks(blocks: BlockWithResult[]) {
    const batchState = this.createBatchState(blocks[0]);

    const publicInput = this.blockTracingService.openBatch(
      batchState,
      blocks[0]
    );

    // Trace blocks
    const blockArgumentBatchSize = ProtocolConstants.getConstant(
      "BLOCK_ARGUMENT_BATCH_SIZE",
      parseInt
    );
    const numBlocks = blocks.length;
    const numBatches = Math.ceil(numBlocks / blockArgumentBatchSize);

    const [, blockTraces] = await yieldSequential(
      chunk(blocks, blockArgumentBatchSize),
      async (state, batch, index) => {
        // Trace batch of blocks fitting in single proof
        const partialBlockTrace = this.blockTracingService.openBlock(
          state,
          batch[0],
          publicInput
        );
        const start = state.blockNumber.toString();

        // PI is taken for first chunk of batch, all others use the stateWitness
        // Copy here because we need a fresh instance
        const currentPublicInput = publicInput.clone();
        if (index > 0) {
          currentPublicInput.proverStateRemainder =
            partialBlockTrace.stateWitness.hash();
        }

        const [newState, combinedTraces] = await yieldSequential(
          batch,
          async (state2, block, jndex) => {
            const [newState2, blockTrace, transactions] =
              await this.blockTracingService.traceBlock(state2, block);
            return [
              newState2,
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              [blockTrace, transactions] as [
                NewBlockArguments,
                TransactionTrace[],
              ],
            ];
          },
          state
        );

        const [blockArgumentBatch, transactionTraces] = unzip(combinedTraces);

        // Fill up with dummies
        const dummyBlockArgs = BlockArguments.noop(
          newState,
          Field(blocks.at(-1)!.result.stateRoot)
        );
        const dummies = range(
          blockArgumentBatch.length,
          blockArgumentBatchSize
        ).map<NewBlockArguments>(() => ({
          args: dummyBlockArgs,
          startingStateAfterHook: {},
          startingStateBeforeHook: {},
        }));

        const blockTrace: BlockTrace = {
          block: {
            ...partialBlockTrace,
            publicInput: currentPublicInput,
            blocks: blockArgumentBatch.concat(dummies),
            deferTransactionProof: Bool(numBatches - 1 !== index),
            deferSTProof: Bool(numBatches - 1 !== index),
          },
          heights: [start, newState.blockNumber.toString()],
        };

        return [
          newState,
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          [blockTrace, transactionTraces] as [BlockTrace, TransactionTrace[][]],
        ];
      },
      batchState
    );

    return {
      blockTraces: blockTraces.map(([x]) => x),
      transactionTraces: blockTraces.map(([, x]) => x),
    };
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
      return { blocks: [], stateTransitionTrace: [], transactions: [] };
    }

    // Traces the STs and the blocks in parallel, however not in separate processes
    // Therefore, we only optimize the idle time for async operations like DB reads
    const [{ blockTraces, transactionTraces }, stateTransitionTrace] =
      await Promise.all([
        // Trace blocks
        this.traceBlocks(blocks),
        // Trace STs
        this.traceStateTransitions(blocks, merkleTreeStore),
      ]);

    return {
      blocks: blockTraces,
      transactions: transactionTraces.flat(2),
      stateTransitionTrace,
    };
  }
}
