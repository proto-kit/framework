import {
  BlockHashMerkleTreeWitness,
  BlockProverPublicInput,
  BlockProverState,
  NetworkState,
  WitnessedRootWitness,
} from "@proto-kit/protocol";
import { Bool, Field } from "o1js";
import { toStateTransitionsHash } from "@proto-kit/module";
import { yieldSequential } from "@proto-kit/common";
// eslint-disable-next-line import/no-extraneous-dependencies
import chunk from "lodash/chunk";
import { inject, injectable } from "tsyringe";

import { BlockWithResult } from "../../../storage/model/Block";
import type { NewBlockProverParameters } from "../tasks/NewBlockTask";
import { Tracer } from "../../../logging/Tracer";
import { trace } from "../../../logging/trace";

import {
  collectStartingState,
  TransactionTrace,
  TransactionTracingService,
} from "./TransactionTracingService";
import { UntypedStateTransition, UntypedSTJson } from "../helpers/UntypedStateTransition";

export type TaskStateRecord = Record<string, Field[]>;

export type BlockTracingState = Pick<
  BlockProverState,
  | "witnessedRoots"
  | "stateRoot"
  | "pendingSTBatches"
  | "networkState"
  | "transactionList"
  | "eternalTransactionsList"
  | "incomingMessages"
>;

export type BlockTrace = {
  blockParams: NewBlockProverParameters;
  transactions: TransactionTrace[];
  // Only for debugging and logging
  height: string;
};

@injectable()
export class BlockTracingService {
  public constructor(
    private readonly transactionTracing: TransactionTracingService,
    @inject("Tracer")
    public readonly tracer: Tracer
  ) {}

  @trace("batch.trace.block", ([, block]) => ({
    height: block.block.height,
  }))
  public async traceBlock(
    state: BlockTracingState,
    block: BlockWithResult,
    includeSTProof: boolean
  ): Promise<[BlockTracingState, BlockTrace]> {
    const publicInput: BlockProverPublicInput = new BlockProverPublicInput({
      stateRoot: state.stateRoot,
      blockNumber: Field(block.block.height),
      blockHashRoot: Field(block.block.fromBlockHashRoot),
      eternalTransactionsHash: Field(block.block.fromEternalTransactionsHash),
      incomingMessagesHash: Field(block.block.fromMessagesHash),
      transactionsHash: Field(0),
      networkStateHash: new NetworkState(
        NetworkState.fromJSON(block.block.networkState.before)
      ).hash(),
      witnessedRootsHash: state.witnessedRoots.commitment,
      pendingSTBatchesHash: state.pendingSTBatches.commitment,
    });

    const startingStateBeforeHook = collectStartingState(
      block.block.beforeBlockStateTransitions.map((st: UntypedSTJson) => UntypedStateTransition.fromJSON(st))
    );

    const blockTrace = {
      publicInput,
      networkState: new NetworkState(
        NetworkState.fromJSON(block.block.networkState.before)
      ) ,
      deferSTProof: Bool(!includeSTProof),
      blockWitness: new BlockHashMerkleTreeWitness(
        BlockHashMerkleTreeWitness.fromJSON(block.result.blockHashWitness)
      ),
      startingStateBeforeHook,
    } satisfies Partial<NewBlockProverParameters>;

    state.pendingSTBatches.push({
      batchHash: toStateTransitionsHash(
        block.block.beforeBlockStateTransitions.map((st: UntypedSTJson) => UntypedStateTransition.fromJSON(st))
      ),
      applied: Bool(true),
    });
    state.networkState = new NetworkState(
        NetworkState.fromJSON(block.block.networkState.during)
      ) ;

    const [afterState, transactionTraces] = await yieldSequential(
      chunk(block.block.transactions, 2),
      async (input, [transaction1, transaction2]) => {
        const [output, transactionTrace] =
          transaction2 !== undefined
            ? await this.transactionTracing.createMultiTransactionTrace(
                input,
                transaction1,
                transaction2
              )
            : await this.transactionTracing.createSingleTransactionTrace(
                input,
                transaction1
              );

        return [output, transactionTrace];
      },
      state
    );

    const preimage = afterState.witnessedRoots
      .getUnconstrainedValues()
      .get()
      .at(-2)?.preimage;

    const afterBlockRootWitness: WitnessedRootWitness = {
      witnessedRoot: Field(block.result.witnessedRoots[0]),
      preimage: preimage ?? Field(0),
    };

    if (afterState.pendingSTBatches.commitment.equals(0).not().toBoolean()) {
      state.witnessedRoots.witnessRoot(
        {
          appliedBatchListState: afterState.pendingSTBatches.commitment,
          root: afterBlockRootWitness.witnessedRoot,
        },
        afterBlockRootWitness.preimage,
        state.pendingSTBatches.commitment.equals(0).not()
      );
    }

    const startingStateAfterHook = collectStartingState(
      block.result.afterBlockStateTransitions.map((st: UntypedSTJson) => UntypedStateTransition.fromJSON(st))
    );
    state.networkState = new NetworkState(
       NetworkState.fromJSON(block.result.afterNetworkState)
      );

    return [
      afterState,
      {
        blockParams: {
          ...blockTrace,
          startingStateAfterHook,
          afterBlockRootWitness,
        },
        transactions: transactionTraces,
        height: block.block.height,
      },
    ];
  }
}
