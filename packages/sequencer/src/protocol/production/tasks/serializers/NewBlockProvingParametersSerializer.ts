import {
  BlockArguments,
  BlockHashMerkleTreeWitness,
  BlockProverPublicInput,
  ProvableNetworkState,
  ReturnType,
  StateTransitionProof,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
  TransactionProof,
  TransactionProverPublicInput,
  TransactionProverPublicOutput,
} from "@proto-kit/protocol";
import { Bool } from "o1js";

import type { NewBlockProverParameters } from "../NewBlockTask";
import { TaskSerializer } from "../../../../worker/flow/Task";
import { ProofTaskSerializer } from "../../../../helpers/utils";
import { PairingDerivedInput } from "../../flow/ReductionTaskFlow";

import { DecodedStateSerializer, JSONEncodableState } from "./DecodedStateSerializer";

interface JsonType {
  input1: string;
  input2: string;
  params: {
    publicInput: ReturnType<typeof BlockProverPublicInput.toJSON>;
    networkState: ReturnType<typeof ProvableNetworkState.toJSON>;
    blockWitness: ReturnType<typeof BlockHashMerkleTreeWitness.toJSON>;
    deferSTProof: boolean;
    deferTransactionProof: boolean;
    blocks: {
      startingStateBeforeHook: JSONEncodableState;
      startingStateAfterHook: JSONEncodableState;
      args: ReturnType<typeof BlockArguments.toJSON>;
    }[];
  };
}

type NewBlockPayload = PairingDerivedInput<
  StateTransitionProof,
  TransactionProof,
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
    private readonly transactionProofSerializer: ProofTaskSerializer<
      TransactionProverPublicInput,
      TransactionProverPublicOutput
    >
  ) {}

  public toJSON(input: NewBlockPayload) {
    return JSON.stringify({
      input1: this.stProofSerializer.toJSON(input.input1),
      input2: this.transactionProofSerializer.toJSON(input.input2),

      params: {
        publicInput: BlockProverPublicInput.toJSON(input.params.publicInput),

        networkState: ProvableNetworkState.toJSON(input.params.networkState),

        blockWitness: BlockHashMerkleTreeWitness.toJSON(
          input.params.blockWitness
        ),

        blocks: input.params.blocks.map((block) => {
          return {
            startingStateBeforeHook: block.startingStateBeforeHook,

            startingStateAfterHook: block.startingStateAfterHook,

            args: BlockArguments.toJSON(block.args),
          };
        }),

        deferSTProof: input.params.deferSTProof.toBoolean(),
        deferTransactionProof: input.params.deferTransactionProof.toBoolean(),
      },
    } satisfies JsonType);
  }

  async fromJSON(json: string): Promise<NewBlockPayload> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const jsonObject: JsonType = JSON.parse(json);
    return {
      input1: await this.stProofSerializer.fromJSON(jsonObject.input1),
      input2: await this.transactionProofSerializer.fromJSON(jsonObject.input2),

      params: {
        publicInput: BlockProverPublicInput.fromJSON(
          jsonObject.params.publicInput
        ),

        networkState: new ProvableNetworkState(
          ProvableNetworkState.fromJSON(jsonObject.params.networkState)
        ),

        blockWitness: new BlockHashMerkleTreeWitness(
          BlockHashMerkleTreeWitness.fromJSON(jsonObject.params.blockWitness)
        ),

        blocks: jsonObject.params.blocks.map((block) => {
          return {
            startingStateBeforeHook: block.startingStateBeforeHook,


            startingStateAfterHook: block.startingStateBeforeHook,
            

            args: BlockArguments.fromJSON(block.args),
          };
        }),

        deferSTProof: Bool(jsonObject.params.deferSTProof),
        deferTransactionProof: Bool(jsonObject.params.deferTransactionProof),
      },
    };
  }
}
