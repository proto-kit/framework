import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModulesRecord,
  TransactionProof,
  TransactionProvable,
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

import { TransactionProverCompileTask } from "./compile/ProtocolCompileTask";

@injectable()
@scoped(Lifecycle.ContainerScoped)
@task()
@dependencyFactory()
export class TransactionReductionTask
  extends TaskWorkerModule
  implements Task<PairTuple<TransactionProof>, TransactionProof>
{
  private readonly transactionProver: TransactionProvable;

  public name = "transactionReduction";

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<
      MandatoryProtocolModulesRecord & ProtocolModulesRecord
    >,
    private readonly executionContext: ProvableMethodExecutionContext,
    private readonly compileRegistry: CompileRegistry
  ) {
    super();
    this.transactionProver = this.protocol.transactionProver;
  }

  public static dependencies() {
    return {
      TransactionProverCompileTask: {
        useClass: TransactionProverCompileTask,
      },
    };
  }

  public inputSerializer(): TaskSerializer<PairTuple<TransactionProof>> {
    return new PairProofTaskSerializer(() =>
      this.transactionProver.zkProgrammable.proofType()
    );
  }

  public resultSerializer(): TaskSerializer<TransactionProof> {
    return new ProofTaskSerializer(() =>
      this.transactionProver.zkProgrammable.proofType()
    );
  }

  public async compute(
    input: PairTuple<TransactionProof>
  ): Promise<TransactionProof> {
    const [r1, r2] = input;
    await this.transactionProver.merge(r1.publicInput, r1, r2);
    return await this.executionContext
      .current()
      .result.prove<TransactionProof>();
  }

  public async prepare(): Promise<void> {
    await this.transactionProver.compile(this.compileRegistry);
  }
}
