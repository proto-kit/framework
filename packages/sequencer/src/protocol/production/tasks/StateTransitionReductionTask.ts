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
  ProvableMethodExecutionContext,
} from "@proto-kit/common";

import { TaskWorkerModule } from "../../../worker/worker/TaskWorkerModule";
import { Task, TaskSerializer } from "../../../worker/flow/Task";
import {
  PairProofTaskSerializer,
  PairTuple,
  ProofTaskSerializer,
} from "../../../helpers/utils";

@injectable()
@scoped(Lifecycle.ContainerScoped)
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

  public inputSerializer(): TaskSerializer<PairTuple<StateTransitionProof>> {
    return new PairProofTaskSerializer(
      this.stateTransitionProver.zkProgrammable.zkProgram[0].Proof
    );
  }

  public resultSerializer(): TaskSerializer<StateTransitionProof> {
    return new ProofTaskSerializer(
      this.stateTransitionProver.zkProgrammable.zkProgram[0].Proof
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
