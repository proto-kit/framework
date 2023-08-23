import { Provable, Struct } from "snarkyjs";

import { constants } from "../Constants";

import { ProvableStateTransition } from "./StateTransition.js";

/**
 * A Batch of StateTransitions to be consumed by the StateTransitionProver
 * to prove multiple STs at once
 */
export class StateTransitionProvableBatch extends Struct({
  batch: Provable.Array(
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

  private constructor(object: { batch: ProvableStateTransition[] }) {
    super(object);
  }
}
