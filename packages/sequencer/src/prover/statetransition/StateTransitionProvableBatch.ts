import { Struct2 } from "../../Utils.js";
import { Circuit } from "snarkyjs";
import { ProvableStateTransition } from "./StateTransition.js";
import { Constants } from "../../Constants.js";

export class StateTransitionProvableBatch extends Struct2({
  batch: Circuit.array(ProvableStateTransition, Constants.STATE_TRANSITION_PROVER_BATCH_SIZE),
}) {
  public static fromTransitions(transitions: ProvableStateTransition[]): StateTransitionProvableBatch {
    const array = transitions.slice();
    while (array.length < Constants.STATE_TRANSITION_PROVER_BATCH_SIZE) {
      array.push(ProvableStateTransition.dummy());
    }
    return new StateTransitionProvableBatch({batch: array});
  }
}