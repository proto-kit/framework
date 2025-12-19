import {
  BlockProof,
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModulesRecord,
  StateServiceProvider,
  DynamicRuntimeProof,
  TransactionProvable,
  TransactionProof,
} from "@proto-kit/protocol";
import { Runtime } from "@proto-kit/module";
import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  ProvableMethodExecutionContext,
  CompileRegistry,
} from "@proto-kit/common";

import { ProofTaskSerializer } from "../../../helpers/utils";
import { TaskSerializer, Task } from "../../../worker/flow/Task";
import { PreFilledStateService } from "../../../state/prefilled/PreFilledStateService";
import { TaskWorkerModule } from "../../../worker/worker/TaskWorkerModule";
import type { TaskStateRecord } from "../tracing/BlockTracingService";

import { TransactionProvingTaskParameterSerializer } from "./serializers/TransactionProvingTaskParameterSerializer";
import {
  TransactionProvingTaskParameters,
  TransactionProvingType,
} from "./serializers/types/TransactionProvingTypes";

export async function executeWithPrefilledStateService<Return>(
  stateServiceProvider: StateServiceProvider,
  startingStates: TaskStateRecord[],
  callback: () => Promise<Return>
): Promise<Return> {
  startingStates
    .slice()
    .reverse()
    .forEach((startingState) => {
      stateServiceProvider.setCurrentStateService(
        new PreFilledStateService({
          ...startingState,
        })
      );
    });

  const returnValue = await callback();

  stateServiceProvider.popCurrentStateService();

  return returnValue;
}

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class TransactionProvingTask
  extends TaskWorkerModule
  implements Task<TransactionProvingTaskParameters, TransactionProof>
{
  private readonly transactionProver: TransactionProvable;

  private readonly runtimeProofType =
    this.runtime.zkProgrammable.zkProgram[0].Proof;

  public name = "block";

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<
      MandatoryProtocolModulesRecord & ProtocolModulesRecord
    >,
    @inject("Runtime") private readonly runtime: Runtime<never>,
    private readonly executionContext: ProvableMethodExecutionContext,
    private readonly compileRegistry: CompileRegistry
  ) {
    super();
    this.transactionProver = protocol.transactionProver;
  }

  public inputSerializer(): TaskSerializer<TransactionProvingTaskParameters> {
    const runtimeProofSerializer = new ProofTaskSerializer(
      this.runtimeProofType
    );
    return new TransactionProvingTaskParameterSerializer(
      runtimeProofSerializer
    );
  }

  public resultSerializer(): TaskSerializer<TransactionProof> {
    return new ProofTaskSerializer(
      this.transactionProver.zkProgrammable.zkProgram[0].Proof
    );
  }

  public async compute(
    input: TransactionProvingTaskParameters
  ): Promise<BlockProof> {
    await executeWithPrefilledStateService(
      this.protocol.stateServiceProvider,
      input.parameters.startingState,
      async () => {
        const { type, parameters } = input;

        const proof1 = DynamicRuntimeProof.fromProof(input.proof1);

        if (type === TransactionProvingType.SINGLE) {
          await this.transactionProver.proveTransaction(
            parameters.publicInput,
            proof1,
            parameters.executionData
          );
        } else {
          await this.transactionProver.proveTransactions(
            parameters.publicInput,
            proof1,
            DynamicRuntimeProof.fromProof(input.proof2),
            parameters.executionData
          );
        }
      }
    );

    return await executeWithPrefilledStateService(
      this.protocol.stateServiceProvider,
      input.parameters.startingState,
      async () =>
        await this.executionContext.current().result.prove<BlockProof>()
    );
  }

  public async prepare(): Promise<void> {
    // Compile
    await this.transactionProver.compile(this.compileRegistry);
  }
}
