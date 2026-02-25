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
  ProvableMethodExecutionContext,
  implement,
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
@implement("Task")
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

  public inputSerializer(): TaskSerializer<PairTuple<TransactionProof>> {
    return new PairProofTaskSerializer(
      this.transactionProver.zkProgrammable.zkProgram[0].Proof
    );
  }

  public resultSerializer(): TaskSerializer<TransactionProof> {
    return new ProofTaskSerializer(
      this.transactionProver.zkProgrammable.zkProgram[0].Proof
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
