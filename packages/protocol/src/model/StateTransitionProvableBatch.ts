import { Bool, Field, Poseidon, Provable, Struct } from "o1js";
import { range, RollupMerkleTreeWitness } from "@proto-kit/common";

import { constants } from "../Constants";

import { ProvableStateTransition } from "./StateTransition.js";

export class StateTransitionType {
  public static readonly nothing = 2;
  // The reason these are 0 and 1 is to efficiently check
  // x in [inside, closing] in-circuit via the boolean trick
  public static readonly closeAndApply = 1;
  public static readonly closeAndThrowAway = 0;
}

export class ProvableStateTransitionType extends Struct({
  type: Field,
}) {
  public static get nothing(): ProvableStateTransitionType {
    return this.from(StateTransitionType.nothing);
  }

  public static get closeAndApply(): ProvableStateTransitionType {
    return this.from(StateTransitionType.closeAndApply);
  }

  public static get closeAndThrowAway(): ProvableStateTransitionType {
    return this.from(StateTransitionType.closeAndThrowAway);
  }

  private static from(constant: number) {
    return new ProvableStateTransitionType({
      type: Field(constant),
    });
  }

  public isClosing() {
    const { type } = this;
    // check if base is 0 or 1
    // 0^2 == 0 && 1^2 == 1
    return type.mul(type).equals(type);
  }
}

export class AppliedStateTransitionBatch extends Struct({
  batchHash: Field,
  applied: Bool,
}) {}

export class AppliedStateTransitionBatchState extends Struct({
  batchHash: Field,
  root: Field,
}) {
  public hashOrZero(): Field {
    const hash = Poseidon.hash(AppliedStateTransitionBatchState.toFields(this));
    return Provable.if(this.batchHash.equals(0), Field(0), hash);
  }
}

export class MerkleWitnessBatch extends Struct({
  witnesses: Provable.Array(
    RollupMerkleTreeWitness,
    constants.stateTransitionProverBatchSize
  ),
}) {}

/**
 * A Batch of StateTransitions to be consumed by the StateTransitionProver
 * to prove multiple STs at once
 *
 * bases: Describes the state root on which the ST will be applied on
 * If it is zero, this means that this ST should connect with the previous one
 * If it is one, this means that the batch should be closed
 */
export class StateTransitionProvableBatch extends Struct({
  batch: Provable.Array(
    ProvableStateTransition,
    constants.stateTransitionProverBatchSize
  ),

  // bases: Provable.Array(Field, constants.stateTransitionProverBatchSize),

  types: Provable.Array(
    ProvableStateTransitionType,
    constants.stateTransitionProverBatchSize
  ),
}) {
  // public static fromMappings(
  //   transitions: {
  //     transition: ProvableStateTransition;
  //     type: ProvableStateTransitionType;
  //   }[]
  // ): StateTransitionProvableBatch {
  //   const batch = transitions.map((entry) => entry.transition);
  //   const transitionTypes = transitions.map((entry) => entry.type);
  //
  //   // Check that order is correct
  //   let normalSTsStarted = false;
  //   transitionTypes.forEach((x) => {
  //     if (!normalSTsStarted && x.isNormal().toBoolean()) {
  //       normalSTsStarted = true;
  //     }
  //     if (normalSTsStarted && x.isProtocol().toBoolean()) {
  //       throw new Error("Order in initializing STBatch not correct");
  //     }
  //   });
  //
  //   while (batch.length < constants.stateTransitionProverBatchSize) {
  //     batch.push(ProvableStateTransition.dummy());
  //     transitionTypes.push(ProvableStateTransitionType.normal);
  //   }
  //   return new StateTransitionProvableBatch({
  //     batch,
  //     transitionTypes,
  //   });
  // }
  //
  // public static fromTransitions(
  //   transitions: ProvableStateTransition[],
  //   protocolTransitions: ProvableStateTransition[]
  // ): StateTransitionProvableBatch {
  //   const array = transitions.slice().concat(protocolTransitions);
  //
  //   const transitionTypes = range(0, transitions.length)
  //     .map(() => ProvableStateTransitionType.normal)
  //     .concat(
  //       range(0, protocolTransitions.length).map(
  //         () => ProvableStateTransitionType.protocol
  //       )
  //     );
  //
  //   while (array.length < constants.stateTransitionProverBatchSize) {
  //     array.push(ProvableStateTransition.dummy());
  //     transitionTypes.push(ProvableStateTransitionType.normal);
  //   }
  //
  //   return new StateTransitionProvableBatch({
  //     batch: array,
  //     transitionTypes,
  //   });
  // }
}
