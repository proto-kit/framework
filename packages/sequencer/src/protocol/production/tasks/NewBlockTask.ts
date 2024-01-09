import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { Task } from "../../../worker/flow/Task";
import {
  BlockProvable,
  BlockProverExecutionData,
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
import { DecodedStateSerializer } from "./BlockProvingTask";
import { PreFilledStateService } from "../../../state/prefilled/PreFilledStateService";
import { ProvableMethodExecutionContext } from "@proto-kit/common";

type BlockProof = Proof<BlockProverPublicInput, BlockProverPublicOutput>;

export type NewBlockProvingParameters = {
  publicInput: BlockProverPublicInput;
  networkState: NetworkState;
  lastBlockWitness: BlockHashMerkleTreeWitness;
  nextBlockWitness: BlockHashMerkleTreeWitness;
  stateTransitionProof: StateTransitionProof;
  startingState: DecodedState;
};

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
    const {
      publicInput,
      lastBlockWitness,
      nextBlockWitness,
      networkState,
      stateTransitionProof,
      startingState,
    } = input;

    await this.executeWithPrefilledStateService(
      startingState,
      // eslint-disable-next-line putout/putout
      async () => {
        this.blockProver.newBlock(
          publicInput,
          networkState,
          lastBlockWitness,
          nextBlockWitness,
          stateTransitionProof
        );
      }
    );

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

    type JsonType = {
      publicInput: ReturnType<typeof BlockProverPublicInput.toJSON>;
      networkState: ReturnType<typeof NetworkState.toJSON>;
      lastBlockWitness: ReturnType<typeof BlockHashMerkleTreeWitness.toJSON>;
      nextBlockWitness: ReturnType<typeof BlockHashMerkleTreeWitness.toJSON>;
      stateTransitionProof: string;
      startingState: JSONEncodableState;
    };

    return {
      toJSON: (input: NewBlockProvingParameters) => {
        return JSON.stringify({
          publicInput: BlockProverPublicInput.toJSON(input.publicInput),
          networkState: NetworkState.toJSON(input.networkState),
          lastBlockWitness: BlockHashMerkleTreeWitness.toJSON(
            input.lastBlockWitness
          ),
          nextBlockWitness: BlockHashMerkleTreeWitness.toJSON(
            input.nextBlockWitness
          ),
          stateTransitionProof: stProofSerializer.toJSON(
            input.stateTransitionProof
          ),
          startingState: DecodedStateSerializer.toJSON(input.startingState),
        } satisfies JsonType);
      },

      fromJSON: (json: string) => {
        const jsonObject: JsonType = JSON.parse(json);
        return {
          publicInput: BlockProverPublicInput.fromJSON(jsonObject.publicInput),
          networkState: new NetworkState(
            NetworkState.fromJSON(jsonObject.networkState)
          ),
          lastBlockWitness: new BlockHashMerkleTreeWitness(
            BlockHashMerkleTreeWitness.fromJSON(jsonObject.lastBlockWitness)
          ),
          nextBlockWitness: new BlockHashMerkleTreeWitness(
            BlockHashMerkleTreeWitness.fromJSON(jsonObject.nextBlockWitness)
          ),
          stateTransitionProof: stProofSerializer.fromJSON(
            jsonObject.stateTransitionProof
          ),
          startingState: DecodedStateSerializer.fromJSON(
            jsonObject.startingState
          ),
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
