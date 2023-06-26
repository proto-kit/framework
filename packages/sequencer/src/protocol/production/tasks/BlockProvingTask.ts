import {
  MappingTask,
  MapReduceTask,
  PairedMapTask,
  TaskSerializer
} from "../../../worker/manager/ReducableTask";
import {
  BlockProver,
  BlockProverPublicInput, BlockProverState,
  MethodPublicInput, ReturnType,
  StateTransitionProver,
  StateTransitionProverPublicInput, StateTransitionWitnessProvider, Subclass, TypedClass
} from "@yab/protocol";
import { Experimental, Proof } from "snarkyjs";
import { MethodExecutionContext, Runtime } from "@yab/module";
import { inject, injectable } from "tsyringe";
import { PreFilledStateService } from "./providers/PreFilledStateService";
import {
  StateTransitionParametersSerializer,
  StateTransitionProofParameters,
} from "./StateTransitionTaskParameters";
import { RuntimeProofParameters, RuntimeProofParametersSerializer } from "./RuntimeTaskParameters";
import { ProofTaskSerializer } from "../../../helpers/utils";
import ZkProgram = Experimental.ZkProgram;
import { PairingDerivedInput } from "../../../worker/manager/PairingMapReduceTaskRunner";
import { PreFilledWitnessProvider } from "./providers/PreFilledWitnessProvider";

type StateTransitionProof = Proof<StateTransitionProverPublicInput>;
type RuntimeProof = Proof<MethodPublicInput>;
type BlockProof = Proof<BlockProverPublicInput>;

export class StateTransitionTask
  implements
    MappingTask<StateTransitionProofParameters, StateTransitionProof>
{
  private readonly stateTransitionProofType = this.stateTransitionProver.getProofType()

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
    const program = this.stateTransitionProver.getZkProgram();

    // this.witnessProvider.

  }

  name(): string {
    return "stateTransitionProof";
  }

  public async prepare(): Promise<void> {
    await this.stateTransitionProver.getZkProgram().compile();
  }

}

export class RuntimeProvingTask
implements MappingTask<RuntimeProofParameters, RuntimeProof>
{
  protected readonly runtimeProofType = this.runtime.getProofClass();

  public constructor(
    protected readonly runtime: Runtime<never>
  ) {}

  public inputSerializer(): TaskSerializer<RuntimeProofParameters> {
    return new RuntimeProofParametersSerializer();
  }

  public resultSerializer(): TaskSerializer<RuntimeProof> {
    return new ProofTaskSerializer(this.runtimeProofType);
  }

  public async map(input: RuntimeProofParameters): Promise<RuntimeProof> {
    const method = this.runtime.getMethodById(input.tx.methodId.toBigInt());

    const prefilledStateService = new PreFilledStateService(input.state);
    this.runtime.stateServiceProvider.setCurrentStateService(prefilledStateService)

    const executionContext = this.runtime.dependencyContainer.resolve(MethodExecutionContext);
    method(...input.tx.args);
    const { result } = executionContext.current();

    const proof = await result.prove!();

    this.runtime.stateServiceProvider.resetToDefault()
    return proof;
  }

  name(): string {
    return "runtimeProof";
  }

  public async prepare(): Promise<void> {
    this.runtime.precompile();
    await this.runtime.compile();
  }

}

export type BlockProvingTaskInput = PairingDerivedInput<StateTransitionProof, RuntimeProof, BlockProverPublicInput>;

@injectable()
export class BlockProvingTask
  implements MapReduceTask<BlockProvingTaskInput, BlockProof>
{
  private readonly blockProverProgram: ReturnType<typeof BlockProver.prototype.createZkProgram> extends Promise<infer Program> ? Program : any
  private readonly blockProofType: Subclass<TypedClass<BlockProof>>;
  private readonly runtimeProofType = this.runtime.getProofClass();
  private readonly stateTransitionProofType = this.stateTransitionProver.getProofType()

  public constructor(
    private readonly stateTransitionProver: StateTransitionProver,
    private readonly runtime: Runtime<never>,
    private readonly blockProver: BlockProver
  ) {
    this.blockProverProgram = this.blockProver.createZkProgram(this.runtimeProofType);
    this.blockProofType = ZkProgram.Proof(this.blockProverProgram);
  }

  public name(): string {
    return "block";
  }

  public inputSerializer(): TaskSerializer<BlockProvingTaskInput> {
    const stProofSerializer = new ProofTaskSerializer(this.stateTransitionProofType)
    const runtimeProofSerializer = new ProofTaskSerializer(this.runtimeProofType)
    return {
      toJSON(input: BlockProvingTaskInput): string {
        const jsonReadyObject = {
          input1: stProofSerializer.toJSON(input.input1),
          input2: runtimeProofSerializer.toJSON(input.input2),
          params: BlockProverPublicInput.toJSON(input.params),
        };
        return JSON.stringify(jsonReadyObject)
      },

      fromJSON(json: string): BlockProvingTaskInput {
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
      transactionsHash: input.params.fromTransactionsHash,
      stateRoot: input.params.fromStateRoot
    }
    this.blockProver.applyTransaction(
      blockProverState,
      stateTransitionProof,
      runtimeProof
    )
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
