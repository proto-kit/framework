import {
  BlockProvable,
  BlockProverExecutionData,
  BlockProverPublicInput,
  BlockProverPublicOutput,
  MethodPublicOutput,
  Protocol,
  ProtocolModulesRecord,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  ReturnType,
  StateTransitionProof,
  StateTransitionProvable,
} from "@proto-kit/protocol";
import { Proof } from "snarkyjs";
import { Runtime } from "@proto-kit/module";
import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { ProvableMethodExecutionContext } from "@proto-kit/common";

import {
  PairProofTaskSerializer,
  PairTuple,
  ProofTaskSerializer,
} from "../../../helpers/utils";
import { PairingDerivedInput } from "../../../worker/manager/PairingMapReduceFlow";
import { TaskSerializer } from "../../../worker/manager/ReducableTask";
import { Task } from "../../../worker/flow/Task";

import { CompileRegistry } from "./CompileRegistry";

type RuntimeProof = Proof<undefined, MethodPublicOutput>;
type BlockProof = Proof<BlockProverPublicInput, BlockProverPublicOutput>;

export interface BlockProverParameters {
  publicInput: BlockProverPublicInput;
  executionData: BlockProverExecutionData;
}

export type BlockProvingTaskParameters = PairingDerivedInput<
  StateTransitionProof,
  RuntimeProof,
  BlockProverParameters
>;

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class BlockReductionTask
  implements Task<PairTuple<BlockProof>, BlockProof>
{
  private readonly blockProver: BlockProvable;

  public name = "blockReduction";

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<ProtocolModulesRecord>,
    private readonly executionContext: ProvableMethodExecutionContext,
    private readonly compileRegistry: CompileRegistry
  ) {
    this.blockProver = this.protocol.blockProver;
  }

  public inputSerializer(): TaskSerializer<PairTuple<BlockProof>> {
    return new PairProofTaskSerializer(this.blockProver.zkProgram.Proof);
  }

  public resultSerializer(): TaskSerializer<BlockProof> {
    return new ProofTaskSerializer(this.blockProver.zkProgram.Proof);
  }

  public async compute(input: PairTuple<BlockProof>): Promise<BlockProof> {
    const [r1, r2] = input;
    this.blockProver.merge(r1.publicInput, r1, r2);
    return await this.executionContext.current().result.prove<BlockProof>();
  }

  public async prepare(): Promise<void> {
    await this.compileRegistry.compile(
      "BlockProver",
      this.blockProver.zkProgram
    );
  }
}

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class BlockProvingTask
  implements Task<BlockProvingTaskParameters, BlockProof>
{
  private readonly stateTransitionProver: StateTransitionProvable;

  private readonly blockProver: BlockProvable;

  private readonly runtimeProofType =
    this.runtime.zkProgrammable.zkProgram.Proof;

  public name = "block";

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<ProtocolModulesRecord>,
    @inject("Runtime") private readonly runtime: Runtime<never>,
    private readonly executionContext: ProvableMethodExecutionContext,
    private readonly compileRegistry: CompileRegistry
  ) {
    this.stateTransitionProver = protocol.stateTransitionProver;

    this.blockProver = this.protocol.blockProver;
  }

  public inputSerializer(): TaskSerializer<BlockProvingTaskParameters> {
    const stProofSerializer = new ProofTaskSerializer(
      this.stateTransitionProver.zkProgram.Proof
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
          },
        };
        return JSON.stringify(jsonReadyObject);
      },

      fromJSON(json: string): BlockProvingTaskParameters {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const jsonReadyObject: {
          input1: string;
          input2: string;
          params: {
            publicInput: ReturnType<typeof BlockProverPublicInput.toJSON>;
            executionData: ReturnType<typeof BlockProverExecutionData.toJSON>;
          };
        } = JSON.parse(json);

        return {
          input1: stProofSerializer.fromJSON(jsonReadyObject.input1),
          input2: runtimeProofSerializer.fromJSON(jsonReadyObject.input2),

          params: {
            publicInput: BlockProverPublicInput.fromJSON(
              jsonReadyObject.params.publicInput
            ),

            executionData: BlockProverExecutionData.fromJSON(
              jsonReadyObject.params.executionData
            ),
          },
        };
      },
    };
  }

  public resultSerializer(): TaskSerializer<BlockProof> {
    return new ProofTaskSerializer(this.blockProver.zkProgram.Proof);
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
    this.blockProver.proveTransaction(
      input.params.publicInput,
      stateTransitionProof,
      runtimeProof,
      input.params.executionData
    );
    return await this.executionContext.current().result.prove<BlockProof>();
  }

  // eslint-disable-next-line sonarjs/no-identical-functions
  public async prepare(): Promise<void> {
    // Compile
    await this.compileRegistry.compile(
      "BlockProver",
      this.blockProver.zkProgram
    );
  }
}
