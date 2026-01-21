import {
  BlockArguments,
  BlockProverPublicInput,
  BlockProverState,
  Bundle,
  TransactionHashList,
  TransactionProverState,
  WitnessedRootWitness,
  BundleHashList,
  BundlePreimage,
  ProvableNetworkState,
  BlockHashMerkleTreeWitness,
} from "@proto-kit/protocol";
import { Bool, Field } from "o1js";
import { toStateTransitionsHash } from "@proto-kit/module";
import { NonMethods, yieldSequential } from "@proto-kit/common";
import { inject, injectable } from "tsyringe";

import { BlockWithResult } from "../../../storage/model/Block";
import type {
  NewBlockArguments,
  NewBlockProverParameters,
} from "../tasks/NewBlockTask";
import { Tracer } from "../../../logging/Tracer";
import { trace } from "../../../logging/trace";

import {
  collectStartingState,
  TransactionTrace,
  TransactionTracingService,
} from "./TransactionTracingService";

export type BlockTracingState = NonMethods<
  Omit<BlockProverState, "blockWitness">
>;

@injectable()
export class BlockTracingService {
  public constructor(
    private readonly transactionTracing: TransactionTracingService,
    @inject("Tracer")
    public readonly tracer: Tracer
  ) {}

  public openBlock(
    state: BlockTracingState,
    { block: firstBlock, result: firstResult }: BlockWithResult
  ): Pick<
    NewBlockProverParameters,
    "publicInput" | "networkState" | "blockWitness"
  > {
    const publicInput: BlockProverPublicInput = new BlockProverPublicInput({
      stateRoot: Field(state.stateRoot),
      blockNumber: Field(firstBlock.height),
      blockHashRoot: Field(firstBlock.fromBlockHashRoot),
      eternalTransactionsHash: Field(firstBlock.fromEternalTransactionsHash),
      incomingMessagesHash: Field(firstBlock.fromMessagesHash),
      networkStateHash: new ProvableNetworkState(
        ProvableNetworkState.fromJSON(firstBlock.networkState.before)
      ).hash(),
      remainders: {
        witnessedRootsHash: state.witnessedRoots.commitment,
        pendingSTBatchesHash: state.pendingSTBatches.commitment,
        bundlesHash: state.bundleList.commitment,
      },
    });

    return {
      publicInput,
      networkState: new ProvableNetworkState(
        ProvableNetworkState.fromJSON(firstBlock.networkState.before)
      ),
      blockWitness: new BlockHashMerkleTreeWitness(
        BlockHashMerkleTreeWitness.fromJSON(firstResult.blockHashWitness)
      ),
    };
  }

  @trace("batch.trace.block", ([, block]) => ({
    height: block.block.height,
  }))
  public async traceBlock(
    state: BlockTracingState,
    block: BlockWithResult
  ): Promise<[BlockTracingState, NewBlockArguments, TransactionTrace[]]> {
    const startingStateBeforeHook = collectStartingState(
      block.block.beforeBlockStateTransitions
    );

    state.pendingSTBatches.push({
      batchHash: toStateTransitionsHash(
        block.block.beforeBlockStateTransitions
      ),
      applied: Bool(true),
    });
    state.networkState = new ProvableNetworkState(
      ProvableNetworkState.fromJSON(block.block.networkState.during)
    );

    const blockArgsPartial = {
      fromPendingSTBatchesHash: state.pendingSTBatches.commitment,
      fromWitnessedRootsHash: state.witnessedRoots.commitment,
    };

    const transactionProverState = new TransactionProverState({
      transactionList: new TransactionHashList(),
      witnessedRoots: state.witnessedRoots,
      pendingSTBatches: state.pendingSTBatches,
      incomingMessages: state.incomingMessages,
      eternalTransactionsList: state.eternalTransactionsList,
      bundleList: new BundleHashList(
        state.bundleList.commitment,
        // The preimage here is just the current state (the start of the block)
        // Internally, both provers will detect commitment == preimage and start
        // a new bundle
        new BundlePreimage({
          preimage: state.bundleList.commitment,
          fromStateTransitionsHash: state.pendingSTBatches.commitment,
          fromWitnessedRootsHash: state.witnessedRoots.commitment,
        })
      ),
    });

    const [afterState, transactionTraces] = await yieldSequential(
      block.block.transactions,
      async (input, transaction) => {
        const [output, transactionTrace] =
          await this.transactionTracing.createTransactionTrace(
            input,
            ProvableNetworkState.toJSON(state.networkState),
            transaction
          );

        return [output, transactionTrace];
      },
      transactionProverState
    );

    // TODO Maybe replace this with replicating the in-circuit version inside createTransactionTrace
    // Add to bundleList (before all the afterBlock stuff since bundles only care about
    // all the stuff that happens in the TransactionProver)
    // Also, this list is a different instance than the one used in transaction tracing
    const finishedBundle = new Bundle({
      networkStateHash: state.networkState.hash(),
      transactionsHash: Field(block.block.transactionsHash),
      pendingSTBatchesHash: {
        from: blockArgsPartial.fromPendingSTBatchesHash,
        to: afterState.pendingSTBatches.commitment,
      },
      witnessedRootsHash: {
        from: blockArgsPartial.fromWitnessedRootsHash,
        to: afterState.witnessedRoots.commitment,
      },
    });
    state.bundleList.pushIf(
      finishedBundle,
      afterState.transactionList.isEmpty().not()
    );

    state.pendingSTBatches = afterState.pendingSTBatches;
    state.witnessedRoots = afterState.witnessedRoots;
    state.incomingMessages = afterState.incomingMessages;
    state.eternalTransactionsList = afterState.eternalTransactionsList;

    const preimage = afterState.witnessedRoots
      .getUnconstrainedValues()
      .get()
      .at(-2)?.preimage;

    const afterBlockRootWitness: WitnessedRootWitness = {
      witnessedRoot: Field(block.result.witnessedRoots[0]),
      preimage: preimage ?? Field(0),
    };

    // We create the batch here, because we need the afterBlockRootWitness,
    // but the afterBlock's witnessed root can't be in the arguments, because
    // it is temporally **after** the bundle, not inside it
    const args = new BlockArguments({
      transactionsHash: afterState.transactionList.commitment,
      afterBlockRootWitness,
      witnessedRootsHash: {
        from: blockArgsPartial.fromWitnessedRootsHash,
        to: state.witnessedRoots.commitment,
      },
      pendingSTBatchesHash: {
        from: blockArgsPartial.fromPendingSTBatchesHash,
        to: state.pendingSTBatches.commitment,
      },
      isDummy: Bool(false),
    });

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
      block.result.afterBlockStateTransitions
    );
    state.pendingSTBatches.push({
      batchHash: toStateTransitionsHash(
        block.result.afterBlockStateTransitions
      ),
      applied: Bool(true),
    });
    state.networkState = new ProvableNetworkState(
      ProvableNetworkState.fromJSON(block.result.afterNetworkState)
    );

    state.blockNumber = state.blockNumber.add(1);

    return [
      state,
      {
        args,
        startingStateBeforeHook,
        startingStateAfterHook,
      },
      transactionTraces,
    ];
  }
}
