import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  StateTransitionProof,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "@proto-kit/protocol";
import { Field } from "o1js";

import { FlowCreator } from "../../../worker/flow/Flow";
import {
  StateTransitionProofParameters,
  StateTransitionTask,
} from "../tasks/StateTransitionTask";
import { StateTransitionReductionTask } from "../tasks/StateTransitionReductionTask";

import { ReductionTaskFlow } from "./ReductionTaskFlow";
import { dependencyFactory, DependencyRecord } from "@proto-kit/common";

@injectable()
@scoped(Lifecycle.ContainerScoped)
@dependencyFactory()
export class StateTransitionFlow {
  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    private readonly flowCreator: FlowCreator,
    private readonly stateTransitionTask: StateTransitionTask,
    private readonly stateTransitionReductionTask: StateTransitionReductionTask
  ) {}
  public static dependencies(): DependencyRecord {
    return {
      stateTransitionTask: {
        useClass: StateTransitionTask,
      },
      stateTransitionReductionTask: {
        useClass: StateTransitionReductionTask,
      },
    };
  }
  private async dummySTProof(): Promise<StateTransitionProof> {
    const emptyInputOutput: StateTransitionProverPublicInput &
      StateTransitionProverPublicOutput = {
      root: Field(0),
      currentBatchStateHash: Field(0),
      batchesHash: Field(0),
      witnessedRootsHash: Field(0),
    };

    return await this.protocol.stateTransitionProver.zkProgrammable.zkProgram[0].Proof.dummy(
      emptyInputOutput,
      emptyInputOutput,
      2
    );
  }

  private createFlow(name: string, inputLength: number) {
    return new ReductionTaskFlow(
      {
        name,
        inputLength,
        mappingTask: this.stateTransitionTask,
        reductionTask: this.stateTransitionReductionTask,

        mergableFunction: (a, b) =>
          a.publicOutput.root
            .equals(b.publicInput.root)
            .and(
              a.publicOutput.witnessedRootsHash.equals(
                b.publicInput.witnessedRootsHash
              )
            )
            .and(
              a.publicOutput.currentBatchStateHash.equals(
                b.publicInput.currentBatchStateHash
              )
            )
            .and(a.publicOutput.batchesHash.equals(b.publicInput.batchesHash))
            .toBoolean(),
      },
      this.flowCreator
    );
  }

  public async executeBatches(
    trace: StateTransitionProofParameters[],
    batchId: number,
    callback: (result: StateTransitionProof) => Promise<void>
  ) {
    if (trace.length > 0) {
      const flow = this.createFlow(`st-proof-${batchId}`, trace.length);

      await flow.flow.forEach(trace, async (input) => {
        await flow.pushInput(input);
      });

      flow.onCompletion(callback);
    } else {
      const dummy = await this.dummySTProof();
      await callback(dummy);
    }
  }
}
