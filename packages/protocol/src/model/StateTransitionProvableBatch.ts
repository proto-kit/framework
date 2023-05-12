import { Circuit, Struct } from "snarkyjs";
import { ProvableStateTransition } from "./StateTransition.js";

const Constants = {
  STATE_TRANSITION_PROVER_BATCH_SIZE: 8
}

export class StateTransitionProvableBatch extends Struct({
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