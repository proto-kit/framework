import {
  AppliedStateTransitionBatchState,
  StateTransitionProvableBatch,
  StateTransitionProverPublicInput,
} from "@proto-kit/protocol";
import {
  LinkedMerkleTreeWitness,
  RollupMerkleTreeWitness,
} from "@proto-kit/common";

import { TaskSerializer } from "../../../../worker/flow/Task";
import type { StateTransitionProofParameters } from "../StateTransitionTask";

interface StateTransitionParametersJSON {
  publicInput: ReturnType<typeof StateTransitionProverPublicInput.toJSON>;
  batch: ReturnType<typeof StateTransitionProvableBatch.toJSON>;
  merkleWitnesses: ReturnType<typeof LinkedMerkleTreeWitness.toJSON>[];
  batchState: ReturnType<typeof AppliedStateTransitionBatchState.toJSON>;
}

export class StateTransitionParametersSerializer
  implements TaskSerializer<StateTransitionProofParameters>
{
  public toJSON(parameters: StateTransitionProofParameters) {
    return JSON.stringify({
      publicInput: StateTransitionProverPublicInput.toJSON(
        parameters.publicInput
      ),

      batch: StateTransitionProvableBatch.toJSON(parameters.batch),

      merkleWitnesses: parameters.merkleWitnesses.map((witness) =>
        LinkedMerkleTreeWitness.toJSON(witness)
      ),

      batchState: AppliedStateTransitionBatchState.toJSON(
        parameters.batchState
      ),
    } satisfies StateTransitionParametersJSON);
  }

  public fromJSON(json: string): StateTransitionProofParameters {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const parsed = JSON.parse(json) as StateTransitionParametersJSON;

    return {
      publicInput: StateTransitionProverPublicInput.fromJSON(
        parsed.publicInput
      ),

      batch: StateTransitionProvableBatch.fromJSON(parsed.batch),

      merkleWitnesses: parsed.merkleWitnesses.map(
        (witness) =>
          new LinkedMerkleTreeWitness(LinkedMerkleTreeWitness.fromJSON(witness))
      ),

      batchState: new AppliedStateTransitionBatchState(
        AppliedStateTransitionBatchState.fromJSON(parsed.batchState)
      ),
    };
  }
}
