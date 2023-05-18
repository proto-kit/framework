import { Circuit, Struct } from "snarkyjs";

import { ProvableStateTransition } from "./StateTransition.js";

const constants = {
  stateTransitionProverBatchSize: 8,
};

/**
 * A Batch of StateTransitions to be consumed by the StateTransitionProver
 * to prove multiple STs at once
 */
export class StateTransitionProvableBatch extends Struct({
  batch: Circuit.array(
    ProvableStateTransition,
    constants.stateTransitionProverBatchSize
  ),
}) {
  public static fromTransitions(
    transitions: ProvableStateTransition[]
  ): StateTransitionProvableBatch {
    const array = transitions.slice();

    while (array.length < constants.stateTransitionProverBatchSize) {
      array.push(ProvableStateTransition.dummy());
    }

    return new StateTransitionProvableBatch({ batch: array });
  }
}
