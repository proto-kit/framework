import { Bool, Provable, Struct } from "o1js";
import { range } from "@proto-kit/common";

import { constants } from "../Constants";

import { ProvableStateTransition } from "./StateTransition.js";

export class StateTransitionType {
  public static readonly normal = true;

  public static readonly protocol = false;

  public static isNormal(type: boolean) {
    return type === StateTransitionType.normal;
  }

  public static isProtocol(type: boolean) {
    return type === StateTransitionType.protocol;
  }
}

export class ProvableStateTransitionType extends Struct({
  type: Bool,
}) {
  public static get normal(): ProvableStateTransitionType {
    return new ProvableStateTransitionType({
      type: Bool(StateTransitionType.normal),
    });
  }

  public static get protocol(): ProvableStateTransitionType {
    return new ProvableStateTransitionType({
      type: Bool(StateTransitionType.protocol),
    });
  }

  public isNormal(): Bool {
    return this.type;
  }

  public isProtocol(): Bool {
    return this.type.not();
  }
}

/**
 * A Batch of StateTransitions to be consumed by the StateTransitionProver
 * to prove multiple STs at once
 *
 * transitionType:
 * true == normal ST, false == protocol ST
 */
export class StateTransitionProvableBatch extends Struct({
  batch: Provable.Array(
    ProvableStateTransition,
    constants.stateTransitionProverBatchSize
  ),

  transitionTypes: Provable.Array(
    ProvableStateTransitionType,
    constants.stateTransitionProverBatchSize
  ),
}) {
  public static fromMappings(
    transitions: {
      transition: ProvableStateTransition;
      type: ProvableStateTransitionType;
    }[]
  ): StateTransitionProvableBatch {
    const batch = transitions.map((entry) => entry.transition);
    const transitionTypes = transitions.map((entry) => entry.type);

    // Check that order is correct
    let normalSTsStarted = false;
    transitionTypes.forEach((x) => {
      if (!normalSTsStarted && x.isNormal().toBoolean()) {
        normalSTsStarted = true;
      }
      if (normalSTsStarted && x.isProtocol().toBoolean()) {
        throw new Error("Order in initializing STBatch not correct");
      }
    });

    while (batch.length < constants.stateTransitionProverBatchSize) {
      batch.push(ProvableStateTransition.dummy());
      transitionTypes.push(ProvableStateTransitionType.normal);
    }
    return new StateTransitionProvableBatch({
      batch,
      transitionTypes,
    });
  }

  public static fromTransitions(
    transitions: ProvableStateTransition[],
    protocolTransitions: ProvableStateTransition[]
  ): StateTransitionProvableBatch {
    const array = transitions.slice().concat(protocolTransitions);

    const transitionTypes = range(0, transitions.length)
      .map(() => ProvableStateTransitionType.normal)
      .concat(
        range(0, protocolTransitions.length).map(
          () => ProvableStateTransitionType.protocol
        )
      );

    while (array.length < constants.stateTransitionProverBatchSize) {
      array.push(ProvableStateTransition.dummy());
      transitionTypes.push(ProvableStateTransitionType.normal);
    }

    return new StateTransitionProvableBatch({
      batch: array,
      transitionTypes,
    });
  }

  private constructor(object: {
    batch: ProvableStateTransition[];
    transitionTypes: ProvableStateTransitionType[];
  }) {
    super(object);
  }
}
