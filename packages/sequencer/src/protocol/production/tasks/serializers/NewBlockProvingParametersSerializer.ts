import {
  BlockHashMerkleTreeWitness,
  BlockProof,
  BlockProverPublicInput,
  BlockProverPublicOutput,
  NetworkState,
  ReturnType,
  StateTransitionProof,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "@proto-kit/protocol";

import type { NewBlockProverParameters } from "../NewBlockTask";
import { TaskSerializer } from "../../../../worker/flow/Task";
import { JSONEncodableState } from "../RuntimeProvingTask";
import { ProofTaskSerializer } from "../../../../helpers/utils";
import { PairingDerivedInput } from "../../flow/ReductionTaskFlow";

import { DecodedStateSerializer } from "./DecodedStateSerializer";

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

type NewBlockPayload = PairingDerivedInput<
  StateTransitionProof,
  BlockProof,
  NewBlockProverParameters
>;

export class NewBlockProvingParametersSerializer
  implements TaskSerializer<NewBlockPayload>
{
  public constructor(
    private readonly stProofSerializer: ProofTaskSerializer<
      StateTransitionProverPublicInput,
      StateTransitionProverPublicOutput
    >,
    private readonly blockProofSerializer: ProofTaskSerializer<
      BlockProverPublicInput,
      BlockProverPublicOutput
    >
  ) {}

  public toJSON(input: NewBlockPayload) {
    return JSON.stringify({
      input1: this.stProofSerializer.toJSON(input.input1),
      input2: this.blockProofSerializer.toJSON(input.input2),

      params: {
        publicInput: BlockProverPublicInput.toJSON(input.params.publicInput),

        networkState: NetworkState.toJSON(input.params.networkState),

        blockWitness: BlockHashMerkleTreeWitness.toJSON(
          input.params.blockWitness
        ),

        startingState: DecodedStateSerializer.toJSON(
          input.params.startingState
        ),
      },
    } satisfies JsonType);
  }

  async fromJSON(json: string): Promise<NewBlockPayload> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const jsonObject: JsonType = JSON.parse(json);
    return {
      input1: await this.stProofSerializer.fromJSON(jsonObject.input1),
      input2: await this.blockProofSerializer.fromJSON(jsonObject.input2),

      params: {
        publicInput: BlockProverPublicInput.fromJSON(
          jsonObject.params.publicInput
        ),

        networkState: new NetworkState(
          NetworkState.fromJSON(jsonObject.params.networkState)
        ),

        blockWitness: new BlockHashMerkleTreeWitness(
          BlockHashMerkleTreeWitness.fromJSON(jsonObject.params.blockWitness)
        ),

        startingState: DecodedStateSerializer.fromJSON(
          jsonObject.params.startingState
        ),
      },
    };
  }
}
