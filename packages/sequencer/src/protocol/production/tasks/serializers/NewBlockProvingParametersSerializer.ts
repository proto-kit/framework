import {
  BlockHashMerkleTreeWitness,
  BlockProverPublicInput,
  NetworkState,
  ReturnType,
  StateTransitionProof,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
  TransactionProof,
  TransactionProverPublicInput,
  TransactionProverPublicOutput,
  WitnessedRootWitness,
} from "@proto-kit/protocol";
import { Bool } from "o1js";

import type { NewBlockProverParameters } from "../NewBlockTask";
import { TaskSerializer } from "../../../../worker/flow/Task";
import { ProofTaskSerializer } from "../../../../helpers/utils";
import { PairingDerivedInput } from "../../flow/ReductionTaskFlow";
import { TaskStateRecordJson } from "../../tracing/BlockTracingService";

interface JsonType {
  input1: string;
  input2: string;
  params: {
    publicInput: ReturnType<typeof BlockProverPublicInput.toJSON>;
    networkState: ReturnType<typeof NetworkState.toJSON>;
    blockWitness: ReturnType<typeof BlockHashMerkleTreeWitness.toJSON>;
    startingStateBeforeHook: TaskStateRecordJson;
    startingStateAfterHook: TaskStateRecordJson;
    deferSTProof: boolean;
    afterBlockRootWitness: ReturnType<typeof WitnessedRootWitness.toJSON>;
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

        networkState: NetworkState.toJSON(input.params.networkState),

        blockWitness: BlockHashMerkleTreeWitness.toJSON(
          input.params.blockWitness
        ),

        startingStateBeforeHook: input.params.startingStateBeforeHook,

        startingStateAfterHook: input.params.startingStateAfterHook,
        deferSTProof: input.params.deferSTProof.toBoolean(),

        afterBlockRootWitness: WitnessedRootWitness.toJSON(
          input.params.afterBlockRootWitness
        ),
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

        networkState: new NetworkState(
          NetworkState.fromJSON(jsonObject.params.networkState)
        ),

        blockWitness: new BlockHashMerkleTreeWitness(
          BlockHashMerkleTreeWitness.fromJSON(jsonObject.params.blockWitness)
        ),

        startingStateBeforeHook: jsonObject.params.startingStateBeforeHook,

        startingStateAfterHook: jsonObject.params.startingStateAfterHook,

        deferSTProof: Bool(jsonObject.params.deferSTProof),

        afterBlockRootWitness: WitnessedRootWitness.fromJSON(
          jsonObject.params.afterBlockRootWitness
        ),
      },
    };
  }
}
