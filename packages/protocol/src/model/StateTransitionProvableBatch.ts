import { Circuit, Struct } from "snarkyjs";

import { ProvableStateTransition } from "./StateTransition.js";
import { constants } from "../Constants";

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
  private constructor(object: { batch: ProvableStateTransition[] }) {
    super(object);
  }

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
