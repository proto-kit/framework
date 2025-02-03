import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModulesRecord,
  ProvableStateTransition,
  ProvableStateTransitionType,
  StateTransitionProof,
  StateTransitionProvable,
  StateTransitionProvableBatch,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "@proto-kit/protocol";
import {
  log,
  ProvableMethodExecutionContext,
  CompileRegistry,
  RollupMerkleTreeWitness,
} from "@proto-kit/common";

import { Task, TaskSerializer } from "../../../worker/flow/Task";
import { ProofTaskSerializer } from "../../../helpers/utils";
import { TaskWorkerModule } from "../../../worker/worker/TaskWorkerModule";

import { StateTransitionParametersSerializer } from "./serializers/StateTransitionParametersSerializer";

export interface StateTransitionProofParameters {
  publicInput: StateTransitionProverPublicInput;
  stateTransitions: {
    transition: ProvableStateTransition;
    type: ProvableStateTransitionType;
  }[];
  merkleWitnesses: RollupMerkleTreeWitness[];
}

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class StateTransitionTask
  extends TaskWorkerModule
  implements Task<StateTransitionProofParameters, StateTransitionProof>
{
  protected readonly stateTransitionProver: StateTransitionProvable;

  public name = "stateTransitionProof";

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<
      MandatoryProtocolModulesRecord & ProtocolModulesRecord
    >,
    private readonly executionContext: ProvableMethodExecutionContext,
    private readonly compileRegistry: CompileRegistry
  ) {
    super();
    this.stateTransitionProver = this.protocol.stateTransitionProver;
  }

  public inputSerializer(): TaskSerializer<StateTransitionProofParameters> {
    return new StateTransitionParametersSerializer();
  }

  public resultSerializer(): TaskSerializer<StateTransitionProof> {
    return new ProofTaskSerializer(
      this.stateTransitionProver.zkProgrammable.zkProgram[0].Proof
    );
  }

  public async compute(
    input: StateTransitionProofParameters
  ): Promise<StateTransitionProof> {
    const stBatch = input.stateTransitions.slice();
    const merkleWitnesses = input.merkleWitnesses.slice();

    const output = await this.stateTransitionProver.runBatch(
      input.publicInput,
      StateTransitionProvableBatch.fromMappings(stBatch, merkleWitnesses)
    );
    log.debug("STTask public io:", {
      input: StateTransitionProverPublicInput.toJSON(input.publicInput),
      output: StateTransitionProverPublicOutput.toJSON(output),
    });

    return await this.executionContext
      .current()
      .result.prove<StateTransitionProof>();
  }

  public async prepare(): Promise<void> {
    await this.stateTransitionProver.compile(this.compileRegistry);
  }
}
