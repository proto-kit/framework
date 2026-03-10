import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  AppliedStateTransitionBatchState,
  MandatoryProtocolModulesRecord,
  MerkleWitnessBatch,
  Protocol,
  ProtocolModulesRecord,
  StateTransitionProof,
  StateTransitionProvable,
  StateTransitionProvableBatch,
  StateTransitionProverPublicInput,
} from "@proto-kit/protocol";
import {
  ProvableMethodExecutionContext,
  CompileRegistry,
  LinkedMerkleTreeWitness,
  dependencyFactory,
} from "@proto-kit/common";

import { Task, TaskSerializer } from "../../../worker/flow/Task";
import { ProofTaskSerializer } from "../../../helpers/utils";
import {
  task,
  TaskWorkerModule,
} from "../../../worker/worker/TaskWorkerModule";

import { StateTransitionParametersSerializer } from "./serializers/StateTransitionParametersSerializer";
import { STProverCompileTask } from "./compile/ProtocolCompileTask";

export interface StateTransitionProofParameters {
  publicInput: StateTransitionProverPublicInput;
  batch: StateTransitionProvableBatch;
  batchState: AppliedStateTransitionBatchState;
  merkleWitnesses: LinkedMerkleTreeWitness[];
}

@injectable()
@scoped(Lifecycle.ContainerScoped)
@task()
@dependencyFactory()
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

  public static dependencies() {
    return {
      //   STProverCompileTask: {
      //     useClass: STProverCompileTask,
      //   },
    };
  }

  public async compute(
    input: StateTransitionProofParameters
  ): Promise<StateTransitionProof> {
    await this.stateTransitionProver.proveBatch(
      input.publicInput,
      input.batch,
      new MerkleWitnessBatch({ witnesses: input.merkleWitnesses.slice() }),
      input.batchState
    );

    return await this.executionContext
      .current()
      .result.prove<StateTransitionProof>();
  }

  public async prepare(): Promise<void> {
    await this.stateTransitionProver.compile(this.compileRegistry);
  }
}
