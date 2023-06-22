import {
  MapReduceTask,
  PairedMapTask,
  TaskSerializer,
} from "../../../worker/manager/ReducableTask";
import {
  BlockProver,
  BlockProverPublicInput,
  MethodPublicInput, ReturnType,
  StateTransitionProver,
  StateTransitionProverPublicInput, Subclass, TypedClass
} from "@yab/protocol";
import { Experimental, Proof } from "snarkyjs";
import { MethodExecutionContext, Runtime } from "@yab/module";
import { injectable } from "tsyringe";
import { PreFilledStateService } from "./PreFilledStateService";
import {
  StateTransitionParametersSerializer,
  StateTransitionProofParameters,
} from "./StateTransitionTaskParameters";
import { RuntimeProofParameters, RuntimeProofParametersSerializer } from "./RuntimeTaskParameters";
import { ProofTaskSerializer } from "../../../helpers/utils";
import ZkProgram = Experimental.ZkProgram;
import { MapReduceDerivedInput } from "../../../worker/manager/TwoStageTaskRunner";

type StateTransitionProof = Proof<StateTransitionProverPublicInput>;
type AppchainProof = Proof<MethodPublicInput>;
type BlockProof = Proof<BlockProverPublicInput>;

export class RuntimeProvingTask
  implements
    PairedMapTask<
      StateTransitionProofParameters,
      StateTransitionProof,
      RuntimeProofParameters,
      AppchainProof
    >
{
  protected readonly stateTransitionProofType = this.stateTransitionProver.getProofType()
  protected readonly runtimeProofType = this.runtime.getProofClass();

  public constructor(
    protected readonly stateTransitionProver: StateTransitionProver,
    protected readonly runtime: Runtime<never>
  ) {}

  public async mapOne(input: StateTransitionProofParameters): Promise<StateTransitionProof> {
    const program = this.stateTransitionProver.getZkProgram();

  }

  public async mapTwo(input: RuntimeProofParameters): Promise<AppchainProof> {
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

  public name(): string {
    return "block";
  }

  public async prepare(): Promise<void> {
    await this.stateTransitionProver.getZkProgram().compile();
    this.runtime.precompile();
    await this.runtime.compile();
  }

  public serializers(): {
    input1: TaskSerializer<StateTransitionProofParameters>;
    output1: TaskSerializer<StateTransitionProof>;
    input2: TaskSerializer<RuntimeProofParameters>;
    output2: TaskSerializer<AppchainProof>
  } {
    const { stateTransitionProofType, runtimeProofType } = this;

    return {
      input1: new StateTransitionParametersSerializer(),

      output1: new ProofTaskSerializer(stateTransitionProofType),

      input2: new RuntimeProofParametersSerializer(),

      output2: new ProofTaskSerializer(runtimeProofType),
    };
  }
}

export type BlockProvingTaskInput = MapReduceDerivedInput<StateTransitionProof, AppchainProof, BlockProverPublicInput>;

@injectable()
export class BlockProvingTask
  extends RuntimeProvingTask
  implements MapReduceTask<BlockProvingTaskInput, BlockProof>
{
  private blockProverProgram: ReturnType<typeof BlockProver.prototype.createZkProgram> extends Promise<infer Program> ? Program : any
  private blockProofType: Subclass<TypedClass<BlockProof>>;

  public constructor(
    stateTransitionProver: StateTransitionProver,
    runtime: Runtime<never>,
    private readonly blockProver: BlockProver
  ) {
    super(stateTransitionProver, runtime);

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

  public async map(t: MapReduceDerivedInput<StateTransitionProof, AppchainProof, BlockProverPublicInput>): Promise<BlockProof> {

  }

  public async prepare(): Promise<void> {
    // Compile
    await this.blockProverProgram.compile();
  }

  public reduce(r1: BlockProof, r2: BlockProof): Promise<BlockProof> {
    return Promise.resolve(undefined);
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

  public serializer(): TaskSerializer<BlockProof> {
    return new ProofTaskSerializer(this.blockProverProgram);
  }
}
