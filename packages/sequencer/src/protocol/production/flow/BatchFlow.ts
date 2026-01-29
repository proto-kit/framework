import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  BlockProof,
  MandatoryProtocolModulesRecord,
  Protocol,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
  TransactionProverPublicInput,
} from "@proto-kit/protocol";
import { isFull, mapSequential, Nullable } from "@proto-kit/common";

import { FlowCreator } from "../../../worker/flow/Flow";
import { NewBlockProvingParameters, NewBlockTask } from "../tasks/NewBlockTask";
import { BlockReductionTask } from "../tasks/BlockReductionTask";
import { BatchTrace } from "../tracing/BatchTracingService";
import { Tracer } from "../../../logging/Tracer";
import { trace } from "../../../logging/trace";

import { ReductionTaskFlow } from "./ReductionTaskFlow";
import { StateTransitionFlow } from "./StateTransitionFlow";
import { BlockFlow } from "./BlockFlow";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class BatchFlow {
  public constructor(
    private readonly flowCreator: FlowCreator,
    private readonly blockProvingTask: NewBlockTask,
    private readonly blockReductionTask: BlockReductionTask,
    private readonly stateTransitionFlow: StateTransitionFlow,
    private readonly transactionFlow: BlockFlow,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    @inject("Tracer")
    public readonly tracer: Tracer
  ) {}

  private isBlockProofsMergable(a: BlockProof, b: BlockProof): boolean {
    // TODO Proper replication of merge logic
    return a.publicOutput.stateRoot
      .equals(b.publicInput.stateRoot)
      .and(a.publicOutput.blockHashRoot.equals(b.publicInput.blockHashRoot))
      .and(
        a.publicOutput.networkStateHash.equals(b.publicInput.networkStateHash)
      )
      .and(
        a.publicOutput.eternalTransactionsHash.equals(
          b.publicInput.eternalTransactionsHash
        )
      )
      .and(
        a.publicOutput.proverStateRemainder.equals(
          b.publicInput.proverStateRemainder
        )
      )
      .toBoolean();
  }

  private async pushBlockInput(
    inputs: Nullable<NewBlockProvingParameters>,
    batchFlow: ReductionTaskFlow<NewBlockProvingParameters, BlockProof>
  ) {
    if (isFull(inputs)) {
      await batchFlow.pushInput(inputs);
    }
  }

  private dummySTProof() {
    return this.protocol.stateTransitionProver.zkProgrammable.zkProgram[0].Proof.dummy(
      StateTransitionProverPublicInput.empty(),
      StateTransitionProverPublicOutput.empty(),
      2
    );
  }

  private dummyTransactionProof() {
    return this.protocol.transactionProver.zkProgrammable.zkProgram[0].Proof.dummy(
      TransactionProverPublicInput.empty(),
      TransactionProverPublicInput.empty(),
      2
    );
  }

  @trace("batch.prove", ([, batchId]) => ({ batchId }))
  public async executeBatch(batch: BatchTrace, batchId: number) {
    const batchFlow = new ReductionTaskFlow(
      {
        name: `batch-${batchId}`,
        inputLength: batch.blocks.length,
        mappingTask: this.blockProvingTask,
        reductionTask: this.blockReductionTask,
        mergableFunction: this.isBlockProofsMergable,
      },
      this.flowCreator
    );

    const lastBlockProofCollector: Nullable<NewBlockProvingParameters> = {
      params: batch.blocks.at(-1)!.block,
      input1: undefined,
      input2: undefined,
    };

    const dummySTProof = await this.dummySTProof();
    const dummyTransactionProof = await this.dummyTransactionProof();

    // TODO Make sure we use deferErrorsTo to everywhere (preferably with a nice pattern)
    //  Currently, a lot of errors just get eaten and the chain just halts with no
    //  error being thrown
    await this.stateTransitionFlow.executeBatches(
      batch.stateTransitionTrace,
      batchId,
      async (proof) => {
        lastBlockProofCollector.input1 = proof;
        await this.pushBlockInput(lastBlockProofCollector, batchFlow);
      }
    );

    // TODO Proper height
    await this.transactionFlow.createTransactionProof(
      batch.blocks[0].heights[0],
      batch.transactions,
      async (proof) => {
        lastBlockProofCollector.input2 = proof;
        await this.pushBlockInput(lastBlockProofCollector, batchFlow);
      }
    );

    // TODO Cover case where either 0 STs or 0 Transactions are in a batch

    // Push all blocks except the last one with dummy proofs
    // except the last one, which will wait on the two proofs to complete
    await mapSequential(
      batch.blocks.slice(0, batch.blocks.length - 1),
      async (blockTrace) => {
        await this.pushBlockInput(
          {
            input1: dummySTProof,
            input2: dummyTransactionProof,
            params: blockTrace.block,
          },
          batchFlow
        );
      }
    );

    return await new Promise<BlockProof>((res, rej) => {
      batchFlow.onCompletion(async (result) => res(result));
    });
  }
}
