import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  BlockProof,
  MandatoryProtocolModulesRecord,
  Protocol,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "@proto-kit/protocol";
import {
  isFull,
  mapSequential,
  MAX_FIELD,
  Nullable,
  range,
} from "@proto-kit/common";

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
    private readonly blockFlow: BlockFlow,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    @inject("Tracer")
    public readonly tracer: Tracer
  ) {}

  private isBlockProofsMergable(a: BlockProof, b: BlockProof): boolean {
    // TODO Proper replication of merge logic
    const part1 = a.publicOutput.stateRoot
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
      .and(a.publicOutput.closed.equals(b.publicOutput.closed))
      .toBoolean();

    const proof1Closed = a.publicOutput.closed;
    const proof2Closed = b.publicOutput.closed;

    const blockNumberProgressionValid = a.publicOutput.blockNumber.equals(
      b.publicInput.blockNumber
    );

    const isValidTransactionMerge = a.publicInput.blockNumber
      .equals(MAX_FIELD)
      .and(blockNumberProgressionValid)
      .and(proof1Closed.or(proof2Closed).not());

    const isValidClosedMerge = proof1Closed
      .and(proof2Closed)
      .and(blockNumberProgressionValid);

    return part1 && isValidClosedMerge.or(isValidTransactionMerge).toBoolean();
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

    const map: Record<
      number,
      Nullable<NewBlockProvingParameters>
    > = Object.fromEntries(
      batch.blocks.map((blockTrace, i) => [
        i,
        {
          params: blockTrace.blockParams,
          input1: undefined,
          input2: undefined,
        },
      ])
    );

    const dummySTProof = await this.dummySTProof();
    range(0, batch.blocks.length - 1).forEach((index) => {
      map[index].input1 = dummySTProof;
    });

    // TODO Make sure we use deferErrorsTo to everywhere (preferably with a nice pattern)
    //  Currently, a lot of errors just get eaten and the chain just halts with no
    //  error being thrown
    await this.stateTransitionFlow.executeBatches(
      batch.stateTransitionTrace,
      batchId,
      async (proof) => {
        const index = batch.blocks.length - 1;
        map[index].input1 = proof;
        await this.pushBlockInput(map[index], batchFlow);
      }
    );

    await mapSequential(batch.blocks, async (blockTrace, blockIndex) => {
      await this.blockFlow.executeBlock(blockTrace, async (proof) => {
        map[blockIndex].input2 = proof;
        await this.pushBlockInput(map[blockIndex], batchFlow);
      });
    });

    return await new Promise<BlockProof>((res, rej) => {
      batchFlow.onCompletion(async (result) => res(result));
    });
  }
}
