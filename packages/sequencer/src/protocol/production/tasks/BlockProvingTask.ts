import {
  BlockProof,
  BlockProvable,
  BlockProverExecutionData,
  BlockProverPublicInput,
  MandatoryProtocolModulesRecord,
  MethodPublicOutput,
  Protocol,
  ProtocolModulesRecord,
  ReturnType,
  StateServiceProvider,
  StateTransitionProof,
  StateTransitionProvable,
} from "@proto-kit/protocol";
import { Field, Proof } from "o1js";
import { Runtime } from "@proto-kit/module";
import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { ProvableMethodExecutionContext } from "@proto-kit/common";

import {
  PairProofTaskSerializer,
  PairTuple,
  ProofTaskSerializer,
} from "../../../helpers/utils";
import { PairingDerivedInput } from "../flow/ReductionTaskFlow";
import { TaskSerializer, Task } from "../../../worker/flow/Task";
import { PreFilledStateService } from "../../../state/prefilled/PreFilledStateService";
import { TaskWorkerModule } from "../../../worker/worker/TaskWorkerModule";
import { TaskStateRecord } from "../TransactionTraceService";

import { CompileRegistry } from "./CompileRegistry";
import { JSONEncodableState } from "./RuntimeTaskParameters";

type RuntimeProof = Proof<undefined, MethodPublicOutput>;

export interface BlockProverParameters {
  publicInput: BlockProverPublicInput;
  executionData: BlockProverExecutionData;
  startingState: TaskStateRecord;
}

export type BlockProvingTaskParameters = PairingDerivedInput<
  StateTransitionProof,
  RuntimeProof,
  BlockProverParameters
>;

export class DecodedStateSerializer {
  public static fromJSON(json: JSONEncodableState): TaskStateRecord {
    return Object.fromEntries<Field[]>(
      Object.entries(json).map(([key, value]) => [
        key,
        value.map((encodedField) => Field(encodedField)),
      ])
    );
  }

  public static toJSON(input: TaskStateRecord): JSONEncodableState {
    return Object.fromEntries<string[]>(
      Object.entries(input).map(([key, value]) => [
        key,
        value.map((field) => field.toString()),
      ])
    );
  }
}

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class BlockReductionTask
  extends TaskWorkerModule
  implements Task<PairTuple<BlockProof>, BlockProof>
{
  private readonly blockProver: BlockProvable;

  public name = "blockReduction";

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<
      MandatoryProtocolModulesRecord & ProtocolModulesRecord
    >,
    private readonly executionContext: ProvableMethodExecutionContext,
    private readonly compileRegistry: CompileRegistry
  ) {
    super();
    this.blockProver = this.protocol.blockProver;
  }

  public inputSerializer(): TaskSerializer<PairTuple<BlockProof>> {
    return new PairProofTaskSerializer(
      this.blockProver.zkProgrammable.zkProgram.Proof
    );
  }

  public resultSerializer(): TaskSerializer<BlockProof> {
    return new ProofTaskSerializer(
      this.blockProver.zkProgrammable.zkProgram.Proof
    );
  }

  public async compute(input: PairTuple<BlockProof>): Promise<BlockProof> {
    const [r1, r2] = input;
    await this.blockProver.merge(r1.publicInput, r1, r2);
    return await this.executionContext.current().result.prove<BlockProof>();
  }

  public async prepare(): Promise<void> {
    await this.compileRegistry.compile(
      "BlockProver",
      this.blockProver.zkProgrammable.zkProgram
    );
  }
}

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class BlockProvingTask
  extends TaskWorkerModule
  implements Task<BlockProvingTaskParameters, BlockProof>
{
  private readonly stateTransitionProver: StateTransitionProvable;

  private readonly blockProver: BlockProvable;

  private readonly runtimeProofType =
    this.runtime.zkProgrammable.zkProgram.Proof;

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

  public inputSerializer(): TaskSerializer<BlockProvingTaskParameters> {
    const stProofSerializer = new ProofTaskSerializer(
      this.stateTransitionProver.zkProgrammable.zkProgram.Proof
    );
    const runtimeProofSerializer = new ProofTaskSerializer(
      this.runtimeProofType
    );
    return {
      toJSON(input: BlockProvingTaskParameters): string {
        const jsonReadyObject = {
          input1: stProofSerializer.toJSON(input.input1),
          input2: runtimeProofSerializer.toJSON(input.input2),

          params: {
            publicInput: BlockProverPublicInput.toJSON(
              input.params.publicInput
            ),

            executionData: BlockProverExecutionData.toJSON(
              input.params.executionData
            ),

            startingState: DecodedStateSerializer.toJSON(
              input.params.startingState
            ),
          },
        };
        return JSON.stringify(jsonReadyObject);
      },

      async fromJSON(json: string): Promise<BlockProvingTaskParameters> {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const jsonReadyObject: {
          input1: string;
          input2: string;
          params: {
            publicInput: ReturnType<typeof BlockProverPublicInput.toJSON>;
            executionData: ReturnType<typeof BlockProverExecutionData.toJSON>;
            startingState: JSONEncodableState;
          };
        } = JSON.parse(json);

        return {
          input1: await stProofSerializer.fromJSON(jsonReadyObject.input1),
          input2: await runtimeProofSerializer.fromJSON(jsonReadyObject.input2),

          params: {
            publicInput: BlockProverPublicInput.fromJSON(
              jsonReadyObject.params.publicInput
            ),

            executionData: BlockProverExecutionData.fromJSON(
              jsonReadyObject.params.executionData
            ),

            startingState: DecodedStateSerializer.fromJSON(
              jsonReadyObject.params.startingState
            ),
          },
        };
      },
    };
  }

  // eslint-disable-next-line sonarjs/no-identical-functions
  public resultSerializer(): TaskSerializer<BlockProof> {
    return new ProofTaskSerializer(
      this.blockProver.zkProgrammable.zkProgram.Proof
    );
  }

  private async executeWithPrefilledStateService<Return>(
    startingState: TaskStateRecord,
    callback: () => Promise<Return>
  ): Promise<Return> {
    const prefilledStateService = new PreFilledStateService(startingState);
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
    const runtimeProof = input.input2;

    await this.executeWithPrefilledStateService(
      input.params.startingState,
      async () => {
        await this.blockProver.proveTransaction(
          input.params.publicInput,
          stateTransitionProof,
          runtimeProof,
          input.params.executionData
        );
      }
    );

    return await this.executeWithPrefilledStateService(
      input.params.startingState,
      async () =>
        await this.executionContext.current().result.prove<BlockProof>()
    );
  }

  // eslint-disable-next-line sonarjs/no-identical-functions
  public async prepare(): Promise<void> {
    // Compile
    await this.compileRegistry.compile(
      "BlockProver",
      this.blockProver.zkProgrammable.zkProgram
    );
  }
}
