import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModulesRecord,
  StateTransitionProof,
  StateTransitionProvable,
} from "@proto-kit/protocol";
import {
  CompileRegistry,
  dependencyFactory,
  ProvableMethodExecutionContext,
} from "@proto-kit/common";

import {
  task,
  TaskWorkerModule,
} from "../../../worker/worker/TaskWorkerModule";
import { Task, TaskSerializer } from "../../../worker/flow/Task";
import {
  PairProofTaskSerializer,
  PairTuple,
  ProofTaskSerializer,
} from "../../../helpers/utils";

import { STProverCompileTask } from "./compile/ProtocolCompileTask";

@injectable()
@scoped(Lifecycle.ContainerScoped)
@task()
@dependencyFactory()
export class StateTransitionReductionTask
  extends TaskWorkerModule
  implements Task<PairTuple<StateTransitionProof>, StateTransitionProof>
{
  protected readonly stateTransitionProver: StateTransitionProvable;

  public name = "stateTransitionReduction";

  public constructor(
    @inject("Protocol")
    private readonly protocol: Pick<
      Protocol<MandatoryProtocolModulesRecord & ProtocolModulesRecord>,
      "stateTransitionProver"
    >,
    private readonly executionContext: ProvableMethodExecutionContext,
    private readonly compileRegistry: CompileRegistry
  ) {
    super();
    this.stateTransitionProver = this.protocol.stateTransitionProver;
  }

  public static dependencies() {
    return {
      STProverCompileTask: {
        useClass: STProverCompileTask,
      },
    };
  }

  public inputSerializer(): TaskSerializer<PairTuple<StateTransitionProof>> {
    return new PairProofTaskSerializer(() =>
      this.stateTransitionProver.zkProgrammable.proofType()
    );
  }

  public resultSerializer(): TaskSerializer<StateTransitionProof> {
    return new ProofTaskSerializer(() =>
      this.stateTransitionProver.zkProgrammable.proofType()
    );
  }

  public async compute(
    input: PairTuple<StateTransitionProof>
  ): Promise<StateTransitionProof> {
    const [r1, r2] = input;
    await this.stateTransitionProver.merge(r1.publicInput, r1, r2);
    return await this.executionContext
      .current()
      .result.prove<StateTransitionProof>();
  }

  public async prepare(): Promise<void> {
    await this.stateTransitionProver.compile(this.compileRegistry);
  }
}
