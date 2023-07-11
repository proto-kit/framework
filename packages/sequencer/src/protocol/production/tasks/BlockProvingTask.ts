import {
  MappingTask,
  MapReduceTask,
  TaskSerializer,
} from "../../../worker/manager/ReducableTask";
import {
  BlockProver,
  ReturnType,
  StateTransitionProvableBatch,
  StateTransitionProver,
  StateTransitionProverPublicInput,
  StateTransitionWitnessProviderReference,
} from "@yab/protocol";
import { Proof } from "snarkyjs";
import {
  MethodPublicOutput,
  Runtime,
  RuntimeMethodExecutionContext,
} from "@yab/module";
import { injectable } from "tsyringe";
import { PreFilledStateService } from "./providers/PreFilledStateService";
import {
  StateTransitionParametersSerializer,
  StateTransitionProofParameters,
} from "./StateTransitionTaskParameters";
import {
  RuntimeProofParameters,
  RuntimeProofParametersSerializer,
} from "./RuntimeTaskParameters";
import { ProofTaskSerializer } from "../../../helpers/utils";
import { PairingDerivedInput } from "../../../worker/manager/PairingMapReduceFlow";
import { StateTransitionProverPublicOutput } from "@yab/protocol/dist/prover/statetransition/StateTransitionProvable";
import {
  BlockProverPublicInput,
  BlockProverPublicOutput,
} from "@yab/protocol/dist/prover/block/BlockProvable";
import { PreFilledWitnessProvider } from "./providers/PreFilledWitnessProvider";

type StateTransitionProof = Proof<
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput
>;
type RuntimeProof = Proof<undefined, MethodPublicOutput>;
type BlockProof = Proof<BlockProverPublicInput, BlockProverPublicOutput>;

export class StateTransitionTask
  implements MappingTask<StateTransitionProofParameters, StateTransitionProof>
{
  private readonly stateTransitionProofType =
    this.stateTransitionProver.zkProgram.Proof;

  public constructor(
    protected readonly stateTransitionProver: StateTransitionProver,
    private readonly executionContext: RuntimeMethodExecutionContext,
    private readonly witnessProviderReference: StateTransitionWitnessProviderReference
  ) {}

  public inputSerializer(): TaskSerializer<StateTransitionProofParameters> {
    return new StateTransitionParametersSerializer();
  }

  public resultSerializer(): TaskSerializer<StateTransitionProof> {
    return new ProofTaskSerializer(this.stateTransitionProofType);
  }

  public async map(
    input: StateTransitionProofParameters
  ): Promise<StateTransitionProof> {
    const witnessProvider = new PreFilledWitnessProvider(input.merkleWitnesses);
    const previousProvider = this.witnessProviderReference.getWitnessProvider();
    this.witnessProviderReference.setWitnessProvider(witnessProvider);

    this.stateTransitionProver.runBatch(
      input.publicInput,
      new StateTransitionProvableBatch({ batch: input.batch })
    );

    const proof = await this.executionContext
      .current()
      .result.prove<StateTransitionProof>();

    if(previousProvider !== undefined){
      this.witnessProviderReference.setWitnessProvider(previousProvider);
    }
    return proof;
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
  protected readonly runtimeZkProgrammable =
    this.runtime.zkProgrammable.zkProgram;

  public constructor(
    protected readonly runtime: Runtime<never>,
    private readonly executionContext: RuntimeMethodExecutionContext
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
    this.runtime.stateServiceProvider.setCurrentStateService(
      prefilledStateService
    );

    method(...input.tx.args);
    const { result } = this.executionContext.current();

    const proof = await result.prove!<RuntimeProof>();

    this.runtime.stateServiceProvider.resetToDefault();
    return proof;
  }

  name(): string {
    return "runtimeProof";
  }

  public async prepare(): Promise<void> {
    await this.runtimeZkProgrammable.compile();
  }
}

export type BlockProvingTaskParameters = PairingDerivedInput<
  StateTransitionProof,
  RuntimeProof,
  BlockProverPublicInput
>;

@injectable()
export class BlockProvingTask
  implements MapReduceTask<BlockProvingTaskParameters, BlockProof>
{
  // private readonly blockProofType: Subclass<TypedClass<BlockProof>>;
  private readonly runtimeProofType =
    this.runtime.zkProgrammable.zkProgram.Proof;
  private readonly stateTransitionProofType =
    this.stateTransitionProver.zkProgram.Proof;

  public constructor(
    private readonly stateTransitionProver: StateTransitionProver,
    private readonly runtime: Runtime<never>,
    private readonly blockProver: BlockProver,
    private readonly executionContext: RuntimeMethodExecutionContext
  ) {
    // this.blockProverProgram = this.blockProver.zkProgram
    // this.blockProofType = ZkProgram.Proof(this.blockProverProgram);
  }

  public name(): string {
    return "block";
  }

  public inputSerializer(): TaskSerializer<BlockProvingTaskParameters> {
    const stProofSerializer = new ProofTaskSerializer(
      this.stateTransitionProofType
    );
    const runtimeProofSerializer = new ProofTaskSerializer(
      this.runtimeProofType
    );
    return {
      toJSON(input: BlockProvingTaskParameters): string {
        const jsonReadyObject = {
          input1: stProofSerializer.toJSON(input.input1),
          input2: runtimeProofSerializer.toJSON(input.input2),
          params: BlockProverPublicInput.toJSON(input.params),
        };
        return JSON.stringify(jsonReadyObject);
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
        };
      },
    };
  }

  public async map(
    input: PairingDerivedInput<
      StateTransitionProof,
      RuntimeProof,
      BlockProverPublicInput
    >
  ): Promise<BlockProof> {
    const stateTransitionProof = input.input1;
    const runtimeProof = input.input2;
    this.blockProver.proveTransaction(
      input.params,
      stateTransitionProof,
      runtimeProof
    );
    return await this.executionContext.current().result.prove<BlockProof>();
  }

  public async prepare(): Promise<void> {
    // Compile
    await this.blockProver.zkProgram.compile();
  }

  public async reduce(r1: BlockProof, r2: BlockProof): Promise<BlockProof> {
    this.blockProver.merge(r1.publicInput, r1, r2);
    return await this.executionContext.current().result.prove<BlockProof>();
  }

  public reducible(r1: BlockProof, r2: BlockProof): boolean {
    return this.orderedReducible(r1, r2) || this.orderedReducible(r2, r1);
  }

  private orderedReducible(r1: BlockProof, r2: BlockProof): boolean {
    return r1.publicOutput.stateRoot
      .equals(r2.publicInput.stateRoot)
      .and(
        r1.publicOutput.transactionsHash.equals(r2.publicInput.transactionsHash)
      )
      .toBoolean();
  }

  public resultSerializer(): TaskSerializer<BlockProof> {
    return new ProofTaskSerializer(this.blockProver.zkProgram.Proof);
  }
}
