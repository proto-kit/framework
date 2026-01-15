import {
  BlockProof,
  BlockProvable,
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModulesRecord,
  StateServiceProvider,
  DynamicRuntimeProof,
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
import { TaskStateRecord, TaskStateRecordJson, taskStateRecordFromJson } from "../tracing/BlockTracingService";

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
  implements Task<TransactionProvingTaskParameters, BlockProof>
{
  private readonly blockProver: BlockProvable;

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
    this.blockProver = protocol.blockProver;
  }

  public inputSerializer(): TaskSerializer<TransactionProvingTaskParameters> {
    const runtimeProofSerializer = new ProofTaskSerializer(
      this.runtimeProofType
    );
    return new TransactionProvingTaskParameterSerializer(
      runtimeProofSerializer
    );
  }

  public resultSerializer(): TaskSerializer<BlockProof> {
    return new ProofTaskSerializer(
      this.blockProver.zkProgrammable.zkProgram[0].Proof
    );
  }

  public async compute(
    input: TransactionProvingTaskParameters
  ): Promise<BlockProof> {

    const startingStateProvable = input.parameters.startingState.map(taskStateRecordFromJson);

    await executeWithPrefilledStateService(
      this.protocol.stateServiceProvider,
      startingStateProvable,
      async () => {
        const { type, parameters } = input;

        const proof1 = DynamicRuntimeProof.fromProof(input.proof1);

        if (type === TransactionProvingType.SINGLE) {
          await this.blockProver.proveTransaction(
            parameters.publicInput,
            proof1,
            parameters.executionData
          );
        } else {
          await this.blockProver.proveTransactions(
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
      startingStateProvable,
      async () =>
        await this.executionContext.current().result.prove<BlockProof>()
    );
  }

  public async prepare(): Promise<void> {
    // Compile
    await this.blockProver.compile(this.compileRegistry);
  }
}
