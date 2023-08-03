import {
  BlockProvable,
  BlockProverPublicInput,
  BlockProverPublicOutput,
  Protocol,
  ProtocolConstants,
  ProtocolModulesRecord,
  ProvableStateTransition,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  ReturnType,
  StateTransitionProvable,
  StateTransitionProvableBatch,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "@yab/protocol";
import { Proof } from "snarkyjs";
import {
  MethodParameterDecoder,
  MethodPublicOutput,
  Runtime,
  RuntimeMethodExecutionContext,
} from "@yab/module";
import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { log, ProvableMethodExecutionContext } from "@yab/common";

import { ProofTaskSerializer } from "../../../helpers/utils";
import { PairingDerivedInput } from "../../../worker/manager/PairingMapReduceFlow";
import {
  MappingTask,
  MapReduceTask,
  TaskSerializer,
} from "../../../worker/manager/ReducableTask";

import { PreFilledStateService } from "./providers/PreFilledStateService";
import {
  StateTransitionParametersSerializer,
  StateTransitionProofParameters,
} from "./StateTransitionTaskParameters";
import {
  RuntimeProofParameters,
  RuntimeProofParametersSerializer,
} from "./RuntimeTaskParameters";
import { PreFilledWitnessProvider } from "./providers/PreFilledWitnessProvider";

type StateTransitionProof = Proof<
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput
>;
type RuntimeProof = Proof<undefined, MethodPublicOutput>;
type BlockProof = Proof<BlockProverPublicInput, BlockProverPublicOutput>;

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class StateTransitionTask
  implements MappingTask<StateTransitionProofParameters, StateTransitionProof>
{
  protected readonly stateTransitionProver: StateTransitionProvable;

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<ProtocolModulesRecord>,
    private readonly executionContext: ProvableMethodExecutionContext
  ) {
    this.stateTransitionProver = this.protocol.stateTransitionProver;
  }

  public inputSerializer(): TaskSerializer<StateTransitionProofParameters> {
    return new StateTransitionParametersSerializer();
  }

  public resultSerializer(): TaskSerializer<StateTransitionProof> {
    return new ProofTaskSerializer(this.stateTransitionProver.zkProgram.Proof);
  }

  public name(): string {
    return "stateTransitionProof";
  }

  public async map(
    input: StateTransitionProofParameters
  ): Promise<StateTransitionProof> {
    const witnessProvider = new PreFilledWitnessProvider(input.merkleWitnesses);

    const { witnessProviderReference } = this.stateTransitionProver;
    const previousProvider = witnessProviderReference.getWitnessProvider();
    witnessProviderReference.setWitnessProvider(witnessProvider);

    const stBatch = input.batch.slice();
    Array.from({
      length: ProtocolConstants.stateTransitionProverBatchSize - stBatch.length,
    }).forEach(() => {
      stBatch.push(ProvableStateTransition.dummy());
    });

    const output = this.stateTransitionProver.runBatch(
      input.publicInput,
      StateTransitionProvableBatch.fromTransitions(stBatch)
    );
    log.debug("STTrask output:", output);

    const proof = await this.executionContext
      .current()
      .result.prove<StateTransitionProof>();

    if (previousProvider !== undefined) {
      witnessProviderReference.setWitnessProvider(previousProvider);
    }
    return proof;
  }

  public async prepare(): Promise<void> {
    await this.stateTransitionProver.zkProgram.compile();
  }
}

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class RuntimeProvingTask
  implements MappingTask<RuntimeProofParameters, RuntimeProof>
{
  protected readonly runtimeZkProgrammable =
    this.runtime.zkProgrammable.zkProgram;

  public constructor(
    @inject("Runtime") protected readonly runtime: Runtime<never>,
    private readonly executionContext: RuntimeMethodExecutionContext
  ) {}

  public inputSerializer(): TaskSerializer<RuntimeProofParameters> {
    return new RuntimeProofParametersSerializer();
  }

  public resultSerializer(): TaskSerializer<RuntimeProof> {
    return new ProofTaskSerializer(this.runtimeZkProgrammable.Proof);
  }

  public name(): string {
    return "runtimeProof";
  }

  public async map(input: RuntimeProofParameters): Promise<RuntimeProof> {
    const method = this.runtime.getMethodById(input.tx.methodId.toBigInt());

    const [moduleName, methodName] = this.runtime.getMethodNameFromId(
      input.tx.methodId.toBigInt()
    );

    const parameterDecoder = MethodParameterDecoder.fromMethod(
      this.runtime.resolve(moduleName),
      methodName
    );
    const decodedArguments = parameterDecoder.fromFields(input.tx.args);

    const prefilledStateService = new PreFilledStateService(input.state);
    this.runtime.stateServiceProvider.setCurrentStateService(
      prefilledStateService
    );

    method(...decodedArguments);
    const { result } = this.executionContext.current();

    const proof = await result.prove<RuntimeProof>();

    this.runtime.stateServiceProvider.resetToDefault();
    return proof;
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
@scoped(Lifecycle.ContainerScoped)
export class BlockProvingTask
  implements MapReduceTask<BlockProvingTaskParameters, BlockProof>
{
  private readonly stateTransitionProver: StateTransitionProvable;

  private readonly blockProver: BlockProvable;

  private readonly runtimeProofType =
    this.runtime.zkProgrammable.zkProgram.Proof;

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<ProtocolModulesRecord>,
    @inject("Runtime") private readonly runtime: Runtime<never>,
    private readonly executionContext: ProvableMethodExecutionContext
  ) {
    this.stateTransitionProver = protocol.stateTransitionProver;

    this.blockProver = this.protocol.blockProver;
  }

  public name(): string {
    return "block";
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
}
