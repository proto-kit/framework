import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  BlockProvable,
  BlockProverPublicInput,
  NetworkState,
  Protocol,
  StateTransitionProof,
  StateTransitionProvable,
  BlockHashMerkleTreeWitness,
  MandatoryProtocolModulesRecord,
  WitnessedRootWitness,
  TransactionProof,
  BlockProof,
  TransactionProvable,
} from "@proto-kit/protocol";
import { Bool } from "o1js";
import {
  ProvableMethodExecutionContext,
  CompileRegistry,
} from "@proto-kit/common";

import { Task, TaskSerializer } from "../../../worker/flow/Task";
import { ProofTaskSerializer } from "../../../helpers/utils";
import { TaskWorkerModule } from "../../../worker/worker/TaskWorkerModule";
import { PairingDerivedInput } from "../flow/ReductionTaskFlow";
import {
  TaskStateRecordJson,
  taskStateRecordFromJson,
} from "../tracing/BlockTracingService";

import { NewBlockProvingParametersSerializer } from "./serializers/NewBlockProvingParametersSerializer";
import { executeWithPrefilledStateService } from "./TransactionProvingTask";

export interface NewBlockProverParameters {
  publicInput: BlockProverPublicInput;
  networkState: NetworkState;
  blockWitness: BlockHashMerkleTreeWitness;
  deferSTProof: Bool;
  afterBlockRootWitness: WitnessedRootWitness;
  startingStateBeforeHook: TaskStateRecordJson;
  startingStateAfterHook: TaskStateRecordJson;
}

export type NewBlockProvingParameters = PairingDerivedInput<
  StateTransitionProof,
  TransactionProof,
  NewBlockProverParameters
>;

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class NewBlockTask
  extends TaskWorkerModule
  implements Task<NewBlockProvingParameters, BlockProof>
{
  private readonly stateTransitionProver: StateTransitionProvable;

  private readonly transactionProver: TransactionProvable;

  private readonly blockProver: BlockProvable;

  public readonly name = "newBlock";

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    private readonly executionContext: ProvableMethodExecutionContext,
    private readonly compileRegistry: CompileRegistry
  ) {
    super();
    this.stateTransitionProver = protocol.stateTransitionProver;
    this.transactionProver = protocol.transactionProver;
    this.blockProver = protocol.blockProver;
  }

  public inputSerializer(): TaskSerializer<NewBlockProvingParameters> {
    const stProofSerializer = new ProofTaskSerializer(
      this.stateTransitionProver.zkProgrammable.zkProgram[0].Proof
    );

    const transactionProofSerializer = new ProofTaskSerializer(
      this.transactionProver.zkProgrammable.zkProgram[0].Proof
    );

    return new NewBlockProvingParametersSerializer(
      stProofSerializer,
      transactionProofSerializer
    );
  }

  public resultSerializer(): TaskSerializer<BlockProof> {
    return new ProofTaskSerializer(
      this.blockProver.zkProgrammable.zkProgram[0].Proof
    );
  }

  public async compute(input: NewBlockProvingParameters): Promise<BlockProof> {
    const { input1, input2, params: parameters } = input;
    const {
      networkState,
      blockWitness,
      startingStateBeforeHook,
      startingStateAfterHook,
      publicInput,
      deferSTProof,
      afterBlockRootWitness,
    } = parameters;

    await this.blockProver.proveBlock(
      publicInput,
      networkState,
      blockWitness,
      input1,
      deferSTProof,
      afterBlockRootWitness,
      input2
    );

    // Convert from JSON to provable types at the proving boundary
    const startingStateBeforeHookProvable = taskStateRecordFromJson(
      startingStateBeforeHook
    );
    const startingStateAfterHookProvable = taskStateRecordFromJson(
      startingStateAfterHook
    );

    await executeWithPrefilledStateService(
      this.protocol.stateServiceProvider,
      [startingStateBeforeHookProvable, startingStateAfterHookProvable],
      async () => {}
    );

    return await executeWithPrefilledStateService(
      this.protocol.stateServiceProvider,
      [startingStateBeforeHookProvable, startingStateAfterHookProvable],
      async () =>
        await this.executionContext.current().result.prove<BlockProof>()
    );
  }

  public async prepare(): Promise<void> {
    // Compile
    await this.transactionProver.compile(this.compileRegistry);
  }
}
