import {
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModulesRecord,
  StateServiceProvider,
  TransactionProvable,
  TransactionProof,
  TransactionProverPublicInput,
} from "@proto-kit/protocol";
import { Runtime } from "@proto-kit/module";
import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  ProvableMethodExecutionContext,
  CompileRegistry,
  dependencyFactory,
} from "@proto-kit/common";

import { ProofTaskSerializer } from "../../../helpers/utils";
import { TaskSerializer, Task } from "../../../worker/flow/Task";
import { PreFilledStateService } from "../../../state/prefilled/PreFilledStateService";
import {
  task,
  TaskWorkerModule,
} from "../../../worker/worker/TaskWorkerModule";
import type { TaskStateRecord } from "../tracing/BlockTracingService";

import { TransactionProvingTaskParameterSerializer } from "./serializers/TransactionProvingTaskParameterSerializer";
import { TransactionProvingTaskParameters } from "./serializers/types/TransactionProvingTypes";
import { TransactionProverCompileTask } from "./compile/ProtocolCompileTask";

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
@task()
@dependencyFactory()
export class TransactionProvingTask
  extends TaskWorkerModule
  implements Task<TransactionProvingTaskParameters, TransactionProof>
{
  private readonly transactionProver: TransactionProvable;

  public name = "transaction";

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

  public static dependencies() {
    return {
      TransactionProverCompileTask: {
        useClass: TransactionProverCompileTask,
      },
    };
  }

  private async runtimeProofType() {
    return await this.runtime.zkProgrammable.proofType();
  }

  public inputSerializer(): TaskSerializer<TransactionProvingTaskParameters> {
    const runtimeProofSerializer = new ProofTaskSerializer(
      this.runtimeProofType.bind(this)
    );
    return new TransactionProvingTaskParameterSerializer(
      runtimeProofSerializer
    );
  }

  public resultSerializer(): TaskSerializer<TransactionProof> {
    return new ProofTaskSerializer(() =>
      this.transactionProver.zkProgrammable.proofType()
    );
  }

  private async computeDummy(): Promise<TransactionProof> {
    await executeWithPrefilledStateService(
      this.protocol.stateServiceProvider,
      [{}, {}],
      async () => {
        await this.transactionProver.dummy(
          TransactionProverPublicInput.empty()
        );
      }
    );

    return await executeWithPrefilledStateService(
      this.protocol.stateServiceProvider,
      [{}, {}],
      async () =>
        await this.executionContext.current().result.prove<TransactionProof>()
    );
  }

  public async compute(
    input: TransactionProvingTaskParameters
  ): Promise<TransactionProof> {
    if (input === "dummy") {
      return await this.computeDummy();
    }

    const DynamicRuntimeProof =
      await this.runtime.zkProgrammable.dynamicProofType();

    const startingState = input.flatMap((i) => i.parameters.startingState);

    await executeWithPrefilledStateService(
      this.protocol.stateServiceProvider,
      startingState,
      async () => {
        const { parameters, proof } = input[0];

        const proof1 = DynamicRuntimeProof.fromProof(proof);

        if (input.length === 1) {
          await this.transactionProver.proveTransaction(
            parameters.publicInput,
            proof1,
            parameters.executionData
          );
        } else {
          const { parameters: parameters2, proof: proof2 } = input[1];

          await this.transactionProver.proveTransactions(
            parameters.publicInput,
            proof1,
            DynamicRuntimeProof.fromProof(proof2),
            parameters.executionData,
            parameters2.executionData
          );
        }
      }
    );

    return await executeWithPrefilledStateService(
      this.protocol.stateServiceProvider,
      startingState,
      async () =>
        await this.executionContext.current().result.prove<TransactionProof>()
    );
  }

  public async prepare(): Promise<void> {
    // Compile
    await this.transactionProver.compile(this.compileRegistry);
  }
}
