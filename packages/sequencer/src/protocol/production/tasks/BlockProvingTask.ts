import {
  MappingTask,
  MapReduceTask,
  TaskSerializer
} from "../../../worker/manager/ReducableTask";
import {
  BlockProver, BlockProverState,
  ReturnType,
  StateTransitionProver, StateTransitionProverPublicInput, Subclass, TypedClass
} from "@yab/protocol";
import { Experimental, Proof } from "snarkyjs";
import { MethodPublicOutput, Runtime, RuntimeMethodExecutionContext } from "@yab/module";
import { injectable } from "tsyringe";
import { PreFilledStateService } from "./providers/PreFilledStateService";
import {
  StateTransitionParametersSerializer,
  StateTransitionProofParameters,
} from "./StateTransitionTaskParameters";
import { RuntimeProofParameters, RuntimeProofParametersSerializer } from "./RuntimeTaskParameters";
import { ProofTaskSerializer } from "../../../helpers/utils";
import ZkProgram = Experimental.ZkProgram;
import { PairingDerivedInput } from "../../../worker/manager/PairingMapReduceFlow";
import {
  StateTransitionProverPublicOutput
} from "@yab/protocol/dist/prover/statetransition/StateTransitionProvable";
import {
  BlockProverPublicInput,
  BlockProverPublicOutput
} from "@yab/protocol/dist/prover/block/BlockProvable";
import { ZkProgrammable } from "@yab/common";

type StateTransitionProof = Proof<StateTransitionProverPublicInput, StateTransitionProverPublicOutput>;
type RuntimeProof = Proof<undefined, MethodPublicOutput>;
type BlockProof = Proof<BlockProverPublicInput, BlockProverPublicOutput>;

export class StateTransitionTask
  implements
    MappingTask<StateTransitionProofParameters, StateTransitionProof>
{
  private readonly stateTransitionProofType = this.stateTransitionProver.zkProgram.Proof

  public constructor(
    protected readonly stateTransitionProver: StateTransitionProver,
    // @inject("StateTransitionWitnessProvider")
    // private witnessProvider: PreFilledWitnessProvider // Check if this works / what it throws if it is wrong
  ) {}

  public inputSerializer(): TaskSerializer<StateTransitionProofParameters> {
    return new StateTransitionParametersSerializer();
  }

  public resultSerializer(): TaskSerializer<StateTransitionProof> {
    return new ProofTaskSerializer(this.stateTransitionProofType);
  }

  public async map(input: StateTransitionProofParameters): Promise<StateTransitionProof> {
    const program = this.stateTransitionProver.zkProgram;

    // this.witnessProvider.

  }

  name(): string {
    return "stateTransitionProof";
  }

  public async prepare(): Promise<void> {
    await this.stateTransitionProver.zkProgram.compile();
  }

}

export class RuntimeProvingTask
implements MappingTask<RuntimeProofParameters, RuntimeProof>
{
  protected readonly runtimeZkProgrammable = this.runtime.zkProgrammable.zkProgram

  public constructor(
    protected readonly runtime: Runtime<never>
  ) {}

  public inputSerializer(): TaskSerializer<RuntimeProofParameters> {
    return new RuntimeProofParametersSerializer();
  }

  public resultSerializer(): TaskSerializer<RuntimeProof> {
    return new ProofTaskSerializer(this.runtimeZkProgrammable.Proof);
  }

  public async map(input: RuntimeProofParameters): Promise<RuntimeProof> {
    const method = this.runtime.getMethodById(input.tx.methodId.toBigInt());

    const prefilledStateService = new PreFilledStateService(input.state);
    this.runtime.stateServiceProvider.setCurrentStateService(prefilledStateService)

    const executionContext = this.runtime.dependencyContainer.resolve(RuntimeMethodExecutionContext);
    method(...input.tx.args);
    const { result } = executionContext.current();

    const proof = await result.prove!<RuntimeProof>();

    this.runtime.stateServiceProvider.resetToDefault()
    return proof;
  }

  name(): string {
    return "runtimeProof";
  }

  public async prepare(): Promise<void> {
    await this.runtimeZkProgrammable.compile();
  }

}

export type BlockProvingTaskParameters = PairingDerivedInput<StateTransitionProof, RuntimeProof, BlockProverPublicInput>;

@injectable()
export class BlockProvingTask
  implements MapReduceTask<BlockProvingTaskParameters, BlockProof>
{
  // private readonly blockProofType: Subclass<TypedClass<BlockProof>>;
  private readonly runtimeProofType = this.runtime.zkProgrammable.zkProgram.Proof;
  private readonly stateTransitionProofType = this.stateTransitionProver.zkProgram.Proof

  public constructor(
    private readonly stateTransitionProver: StateTransitionProver,
    private readonly runtime: Runtime<never>,
    private readonly blockProver: BlockProver
  ) {
    // this.blockProverProgram = this.blockProver.zkProgram
    // this.blockProofType = ZkProgram.Proof(this.blockProverProgram);
  }

  public name(): string {
    return "block";
  }

  public inputSerializer(): TaskSerializer<BlockProvingTaskParameters> {
    const stProofSerializer = new ProofTaskSerializer(this.stateTransitionProofType)
    const runtimeProofSerializer = new ProofTaskSerializer(this.runtimeProofType)
    return {
      toJSON(input: BlockProvingTaskParameters): string {
        const jsonReadyObject = {
          input1: stProofSerializer.toJSON(input.input1),
          input2: runtimeProofSerializer.toJSON(input.input2),
          params: BlockProverPublicInput.toJSON(input.params),
        };
        return JSON.stringify(jsonReadyObject)
      },

      fromJSON(json: string): BlockProvingTaskParameters {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const jsonReadyObject: {
          input1: string;
          input2: string;
          params: ReturnType<typeof BlockProverPublicInput.toJSON>;
        } = JSON.parse(json);

        return {
          input1: stProofSerializer.fromJSON(jsonReadyObject.input1),
          input2: runtimeProofSerializer.fromJSON(jsonReadyObject.input2),
          params: BlockProverPublicInput.fromJSON(jsonReadyObject.params),
        }
      }
    };
  }

  public async map(input: PairingDerivedInput<StateTransitionProof, RuntimeProof, BlockProverPublicInput>): Promise<BlockProof> {
    const stateTransitionProof = input.input1;
    const runtimeProof = input.input2;
    const blockProverState: BlockProverState = {
      transactionsHash: input.params.transactionsHash,
      stateRoot: input.params.stateRoot
    }
    this.blockProver.applyTransaction(
      blockProverState,
      stateTransitionProof,
      runtimeProof
    )
    this.blockProver.zkProgram.
    //return proof;
  }

  public async prepare(): Promise<void> {
    // Compile
    await this.blockProverProgram.compile();
  }

  public async reduce(r1: BlockProof, r2: BlockProof): Promise<BlockProof> {
    this.blockProver.merge(calculatePI, r1, r2);
  }

  public reducible(r1: BlockProof, r2: BlockProof): boolean {
    return this.orderedReducible(r1, r2) || this.orderedReducible(r2, r1);
  }

  private orderedReducible(r1: BlockProof, r2: BlockProof): boolean {
    return r1.publicInput.toStateRoot.equals(r2.publicInput.fromStateRoot)
      .and(
        r1.publicInput.toTransactionsHash.equals(r2.publicInput.fromTransactionsHash)
      )
      .toBoolean();
  }

  public resultSerializer(): TaskSerializer<BlockProof> {
    return new ProofTaskSerializer(this.blockProverProgram);
  }
}
