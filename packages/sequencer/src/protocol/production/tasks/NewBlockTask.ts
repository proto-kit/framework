import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { Task } from "../../../worker/flow/Task";
import {
  BlockProvable,
  BlockProverExecutionData,
  BlockProverProof,
  BlockProverPublicInput,
  BlockProverPublicOutput,
  NetworkState,
  Protocol,
  ProtocolModulesRecord,
  ReturnType,
  StateTransitionProof,
  StateTransitionProvable,
} from "@proto-kit/protocol";
import { BlockHashMerkleTreeWitness } from "@proto-kit/protocol/dist/prover/block/acummulators/BlockHashMerkleTree";
import { Proof } from "o1js";
import { TaskSerializer } from "../../../worker/manager/ReducableTask";
import { ProofTaskSerializer } from "../../../helpers/utils";
import { DecodedState, JSONEncodableState } from "./RuntimeTaskParameters";
import { CompileRegistry } from "./CompileRegistry";
import {
  BlockProverParameters,
  DecodedStateSerializer,
} from "./BlockProvingTask";
import { PreFilledStateService } from "../../../state/prefilled/PreFilledStateService";
import { ProvableMethodExecutionContext } from "@proto-kit/common";
import { PairingDerivedInput } from "../../../worker/manager/PairingMapReduceFlow";

type BlockProof = Proof<BlockProverPublicInput, BlockProverPublicOutput>;

export type NewBlockProverParameters = {
  publicInput: BlockProverPublicInput;
  networkState: NetworkState;
  blockWitness: BlockHashMerkleTreeWitness;
  startingState: DecodedState;
};

export type NewBlockProvingParameters = PairingDerivedInput<
  StateTransitionProof,
  BlockProof,
  NewBlockProverParameters
>;

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class NewBlockTask
  implements Task<NewBlockProvingParameters, BlockProof>
{
  private readonly stateTransitionProver: StateTransitionProvable;

  private readonly blockProver: BlockProvable;

  public readonly name = "newBlock";

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<ProtocolModulesRecord>,
    private readonly executionContext: ProvableMethodExecutionContext,
    private readonly compileRegistry: CompileRegistry
  ) {
    this.stateTransitionProver = protocol.stateTransitionProver;
    this.blockProver = this.protocol.blockProver;
  }

  private async executeWithPrefilledStateService<Return>(
    startingState: DecodedState,
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
    const { input1, input2, params } = input;
    const { networkState, blockWitness, startingState, publicInput } = params;

    await this.executeWithPrefilledStateService(startingState, async () => {
      try {
        this.blockProver.proveBlock(
          publicInput,
          networkState,
          blockWitness,
          input1,
          input2
        );
      }catch(e: unknown){
        console.log(e);
        throw e;
      }
    });

    return await this.executeWithPrefilledStateService(
      startingState,
      async () =>
        await this.executionContext.current().result.prove<BlockProof>()
    );
  }

  public inputSerializer(): TaskSerializer<NewBlockProvingParameters> {
    const stProofSerializer = new ProofTaskSerializer(
      this.stateTransitionProver.zkProgrammable.zkProgram.Proof
    );

    const blockProofSerializer = new ProofTaskSerializer(
      this.blockProver.zkProgrammable.zkProgram.Proof
    );

    type JsonType = {
      input1: string;
      input2: string;
      params: {
        publicInput: ReturnType<typeof BlockProverPublicInput.toJSON>;
        networkState: ReturnType<typeof NetworkState.toJSON>;
        blockWitness: ReturnType<typeof BlockHashMerkleTreeWitness.toJSON>;
        startingState: JSONEncodableState;
      };
    };

    return {
      toJSON: (input: NewBlockProvingParameters) => {
        return JSON.stringify({
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
        } satisfies JsonType);
      },

      fromJSON: (json: string) => {
        const jsonObject: JsonType = JSON.parse(json);
        return {
          input1: stProofSerializer.fromJSON(jsonObject.input1),
          input2: blockProofSerializer.fromJSON(jsonObject.input2),

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

  public async prepare(): Promise<void> {
    // Compile
    await this.compileRegistry.compile(
      "BlockProver",
      this.blockProver.zkProgrammable.zkProgram
    );
  }
}
