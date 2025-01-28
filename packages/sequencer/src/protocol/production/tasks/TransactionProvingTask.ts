import {
  BlockProof,
  BlockProvable,
  BlockProverExecutionData,
  BlockProverPublicInput,
  MandatoryProtocolModulesRecord,
  MethodPublicOutput,
  Protocol,
  ProtocolModulesRecord,
  RuntimeVerificationKeyAttestation,
  StateServiceProvider,
  StateTransitionProof,
  StateTransitionProvable,
  DynamicRuntimeProof,
} from "@proto-kit/protocol";
import { Proof } from "o1js";
import { Runtime } from "@proto-kit/module";
import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  ProvableMethodExecutionContext,
  CompileRegistry,
} from "@proto-kit/common";

import { ProofTaskSerializer } from "../../../helpers/utils";
import { PairingDerivedInput } from "../flow/ReductionTaskFlow";
import { TaskSerializer, Task } from "../../../worker/flow/Task";
import { PreFilledStateService } from "../../../state/prefilled/PreFilledStateService";
import { TaskWorkerModule } from "../../../worker/worker/TaskWorkerModule";
import { TaskStateRecord } from "../TransactionTraceService";

import { TransactionProvingTaskParameterSerializer } from "./serializers/TransactionProvingTaskParameterSerializer";

type RuntimeProof = Proof<undefined, MethodPublicOutput>;

export interface BlockProverParameters {
  publicInput: BlockProverPublicInput;
  executionData: BlockProverExecutionData;
  startingState: TaskStateRecord;
  verificationKeyAttestation: RuntimeVerificationKeyAttestation;
}

export type TransactionProvingTaskParameters = PairingDerivedInput<
  StateTransitionProof,
  RuntimeProof,
  BlockProverParameters
>;

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class TransactionProvingTask
  extends TaskWorkerModule
  implements Task<TransactionProvingTaskParameters, BlockProof>
{
  private readonly stateTransitionProver: StateTransitionProvable;

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
    @inject("StateServiceProvider")
    private readonly stateServiceProvider: StateServiceProvider,
    private readonly executionContext: ProvableMethodExecutionContext,
    private readonly compileRegistry: CompileRegistry
  ) {
    super();
    this.stateTransitionProver = protocol.stateTransitionProver;
    this.blockProver = this.protocol.blockProver;
  }

  public inputSerializer(): TaskSerializer<TransactionProvingTaskParameters> {
    const stProofSerializer = new ProofTaskSerializer(
      this.stateTransitionProver.zkProgrammable.zkProgram[0].Proof
    );
    const runtimeProofSerializer = new ProofTaskSerializer(
      this.runtimeProofType
    );
    return new TransactionProvingTaskParameterSerializer(
      stProofSerializer,
      runtimeProofSerializer
    );
  }

  public resultSerializer(): TaskSerializer<BlockProof> {
    return new ProofTaskSerializer(
      this.blockProver.zkProgrammable.zkProgram[0].Proof
    );
  }

  private async executeWithPrefilledStateService<Return>(
    startingState: TaskStateRecord,
    callback: () => Promise<Return>
  ): Promise<Return> {
    const prefilledStateService = new PreFilledStateService({
      ...startingState,
    });
    this.stateServiceProvider.setCurrentStateService(prefilledStateService);

    const returnValue = await callback();

    this.stateServiceProvider.popCurrentStateService();

    return returnValue;
  }

  public async compute(
    input: PairingDerivedInput<
      StateTransitionProof,
      RuntimeProof,
      BlockProverParameters
    >
  ): Promise<BlockProof> {
    const stateTransitionProof = input.input1;
    const runtimeProofDynamic = DynamicRuntimeProof.fromProof(input.input2);

    await this.executeWithPrefilledStateService(
      input.params.startingState,
      async () => {
        await this.blockProver.proveTransaction(
          input.params.publicInput,
          stateTransitionProof,
          runtimeProofDynamic,
          input.params.executionData,
          input.params.verificationKeyAttestation
        );
      }
    );

    return await this.executeWithPrefilledStateService(
      input.params.startingState,
      async () =>
        await this.executionContext.current().result.prove<BlockProof>()
    );
  }

  public async prepare(): Promise<void> {
    // Compile
    await this.blockProver.compile(this.compileRegistry);
  }
}
