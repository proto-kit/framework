import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  BlockProvable,
  BlockProverPublicInput,
  BlockProverPublicOutput,
  NetworkState,
  Protocol,
  ReturnType,
  StateTransitionProof,
  StateTransitionProvable,
  BlockHashMerkleTreeWitness,
  MandatoryProtocolModulesRecord,
} from "@proto-kit/protocol";
import { Proof } from "o1js";
import { ProvableMethodExecutionContext } from "@proto-kit/common";

import { Task, TaskSerializer } from "../../../worker/flow/Task";
import { ProofTaskSerializer } from "../../../helpers/utils";
import { PreFilledStateService } from "../../../state/prefilled/PreFilledStateService";
import { TaskWorkerModule } from "../../../worker/worker/TaskWorkerModule";
import { PairingDerivedInput } from "../flow/ReductionTaskFlow";
import { TaskStateRecord } from "../TransactionTraceService";

import { JSONEncodableState } from "./RuntimeTaskParameters";
import { CompileRegistry } from "./CompileRegistry";
import { DecodedStateSerializer } from "./BlockProvingTask";

type BlockProof = Proof<BlockProverPublicInput, BlockProverPublicOutput>;

export interface NewBlockProverParameters {
  publicInput: BlockProverPublicInput;
  networkState: NetworkState;
  blockWitness: BlockHashMerkleTreeWitness;
  startingState: TaskStateRecord;
}

export type NewBlockProvingParameters = PairingDerivedInput<
  StateTransitionProof,
  BlockProof,
  NewBlockProverParameters
>;

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class NewBlockTask
  extends TaskWorkerModule
  implements Task<NewBlockProvingParameters, BlockProof>
{
  private readonly stateTransitionProver: StateTransitionProvable;

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
    this.blockProver = this.protocol.blockProver;
  }

  public inputSerializer(): TaskSerializer<NewBlockProvingParameters> {
    const stProofSerializer = new ProofTaskSerializer(
      this.stateTransitionProver.zkProgrammable.zkProgram.Proof
    );

    const blockProofSerializer = new ProofTaskSerializer(
      this.blockProver.zkProgrammable.zkProgram.Proof
    );

    interface JsonType {
      input1: string;
      input2: string;
      params: {
        publicInput: ReturnType<typeof BlockProverPublicInput.toJSON>;
        networkState: ReturnType<typeof NetworkState.toJSON>;
        blockWitness: ReturnType<typeof BlockHashMerkleTreeWitness.toJSON>;
        startingState: JSONEncodableState;
      };
    }

    return {
      toJSON: (input: NewBlockProvingParameters) =>
        JSON.stringify({
          input1: stProofSerializer.toJSON(input.input1),
          input2: blockProofSerializer.toJSON(input.input2),

          params: {
            publicInput: BlockProverPublicInput.toJSON(
              input.params.publicInput
            ),

            networkState: NetworkState.toJSON(input.params.networkState),

            blockWitness: BlockHashMerkleTreeWitness.toJSON(
              input.params.blockWitness
            ),

            startingState: DecodedStateSerializer.toJSON(
              input.params.startingState
            ),
          },
        } satisfies JsonType),

      fromJSON: async (json: string) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const jsonObject: JsonType = JSON.parse(json);
        return {
          input1: await stProofSerializer.fromJSON(jsonObject.input1),
          input2: await blockProofSerializer.fromJSON(jsonObject.input2),

          params: {
            publicInput: BlockProverPublicInput.fromJSON(
              jsonObject.params.publicInput
            ),

            networkState: new NetworkState(
              NetworkState.fromJSON(jsonObject.params.networkState)
            ),

            blockWitness: new BlockHashMerkleTreeWitness(
              BlockHashMerkleTreeWitness.fromJSON(
                jsonObject.params.blockWitness
              )
            ),

            startingState: DecodedStateSerializer.fromJSON(
              jsonObject.params.startingState
            ),
          },
        };
      },
    };
  }

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
    this.protocol.stateServiceProvider.setCurrentStateService(
      prefilledStateService
    );

    const returnValue = await callback();

    this.protocol.stateServiceProvider.popCurrentStateService();

    return returnValue;
  }

  public async compute(input: NewBlockProvingParameters): Promise<BlockProof> {
    const { input1, input2, params: parameters } = input;
    const { networkState, blockWitness, startingState, publicInput } =
      parameters;

    await this.executeWithPrefilledStateService(startingState, async () => {
      await this.blockProver.proveBlock(
        publicInput,
        networkState,
        blockWitness,
        input1,
        input2
      );
    });

    return await this.executeWithPrefilledStateService(
      startingState,
      async () =>
        await this.executionContext.current().result.prove<BlockProof>()
    );
  }

  public async prepare(): Promise<void> {
    // Compile
    await this.compileRegistry.compile(
      "BlockProver",
      this.blockProver.zkProgrammable.zkProgram
    );
  }
}
