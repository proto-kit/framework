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
  TransactionProof,
  BlockProof,
  TransactionProvable,
  BlockArguments,
  BlockArgumentsBatch,
  BlockProverStateInput,
  ProtocolConstants,
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
import type { TaskStateRecord } from "../tracing/BlockTracingService";

import { NewBlockProvingParametersSerializer } from "./serializers/NewBlockProvingParametersSerializer";
import { executeWithPrefilledStateService } from "./TransactionProvingTask";

export type NewBlockArguments = {
  args: BlockArguments;
  startingStateBeforeHook: TaskStateRecord;
  startingStateAfterHook: TaskStateRecord;
};

export interface NewBlockProverParameters {
  publicInput: BlockProverPublicInput;
  stateWitness: BlockProverStateInput;
  networkState: NetworkState;
  blockWitness: BlockHashMerkleTreeWitness;
  deferSTProof: Bool;
  deferTransactionProof: Bool;
  blocks: NewBlockArguments[];
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
      publicInput,
      stateWitness,
      deferSTProof,
      deferTransactionProof,
      blocks,
    } = parameters;

    if (
      blocks.length !==
      ProtocolConstants.getConstant("BLOCK_ARGUMENT_BATCH_SIZE", parseInt)
    ) {
      throw new Error("Given block argument length not exactly batch size");
    }

    const blockArgumentBatch = new BlockArgumentsBatch({
      batch: blocks.map((block) => block.args),
    });

    const stateRecords = blocks.flatMap((block) => [
      block.startingStateBeforeHook,
      block.startingStateAfterHook,
    ]);

    await executeWithPrefilledStateService(
      this.protocol.stateServiceProvider,
      stateRecords,
      async () => {
        if (deferSTProof.toBoolean() && deferTransactionProof.toBoolean()) {
          await this.blockProver.proveBlockBatchNoProofs(
            publicInput,
            stateWitness,
            networkState,
            blockWitness,
            blockArgumentBatch,
            Bool(false)
            // deferSTProof.or(deferTransactionProof)
          );
        } else {
          await this.blockProver.proveBlockBatchWithProofs(
            publicInput,
            stateWitness,
            networkState,
            blockWitness,
            blockArgumentBatch,
            deferSTProof,
            deferTransactionProof,
            input1,
            input2
          );
        }
      }
    );

    return await executeWithPrefilledStateService(
      this.protocol.stateServiceProvider,
      stateRecords,
      async () =>
        await this.executionContext.current().result.prove<BlockProof>()
    );
  }

  public async prepare(): Promise<void> {
    await this.blockProver.compile(this.compileRegistry);
  }
}
