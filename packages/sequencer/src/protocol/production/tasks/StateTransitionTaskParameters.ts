import {
  ProvableStateTransition,
  RollupMerkleWitness,
  StateTransitionProverPublicInput,
} from "@yab/protocol";

import { TaskSerializer } from "../../../worker/manager/ReducableTask";

export interface StateTransitionProofParameters {
  publicInput: StateTransitionProverPublicInput;
  batch: ProvableStateTransition[];
  merkleWitnesses: RollupMerkleWitness[];
}

interface StateTransitionParametersJSON {
  publicInput: ReturnType<typeof StateTransitionProverPublicInput.toJSON>;
  batch: ReturnType<typeof ProvableStateTransition.toJSON>[];
  merkleWitnesses: ReturnType<typeof RollupMerkleWitness.toJSON>[];
}

export class StateTransitionParametersSerializer
  implements TaskSerializer<StateTransitionProofParameters>
{
  public toJSON(params: StateTransitionProofParameters) {
    return JSON.stringify({
      publicInput: StateTransitionProverPublicInput.toJSON(params.publicInput),
      batch: params.batch.map((st) => ProvableStateTransition.toJSON(st)),

      merkleWitnesses: params.merkleWitnesses.map((witness) =>
        RollupMerkleWitness.toJSON(witness)
      ),
    });
  }

  public fromJSON(json: string): StateTransitionProofParameters {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const parsed = JSON.parse(json) as StateTransitionParametersJSON;

    return {
      publicInput: StateTransitionProverPublicInput.fromJSON(
        parsed.publicInput
      ),

      batch: parsed.batch.map(
        (st) =>
          new ProvableStateTransition(ProvableStateTransition.fromJSON(st))
      ),

      merkleWitnesses: parsed.merkleWitnesses.map(
        (witness) =>
          new RollupMerkleWitness(RollupMerkleWitness.fromJSON(witness))
      ),
    };
  }
}
