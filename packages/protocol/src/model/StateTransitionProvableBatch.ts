import { Bool, Field, Provable, Struct } from "o1js";
import { batch, RollupMerkleTreeWitness } from "@proto-kit/common";

import { constants } from "../Constants";

import { ProvableStateTransition } from "./StateTransition.js";

export class StateTransitionType {
  public static readonly nothing = 2;

  // The reason these are 0 and 1 is to efficiently check
  // x in [inside, closing] in-circuit via the boolean trick
  public static readonly closeAndApply = 1;

  public static readonly closeAndThrowAway = 0;
}

/**
 * STType is encoding both the type and whether it should be accumulated or not in one field
 */
export class ProvableStateTransitionType extends Struct({
  type: Field,
  // TODO Remove accumulate or remove the Bool array args
  accumulate: Bool,
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

  private static from(constant: number, accumulate = false) {
    return new ProvableStateTransitionType({
      type: Field(constant),
      accumulate: Bool(accumulate),
    });
  }

  public isClosing() {
    const { type } = this;
    // check if base is 0 or 1
    // 0^2 == 0 && 1^2 == 1
    return type.mul(type).equals(type);
  }
}

export class MerkleWitnessBatch extends Struct({
  witnesses: Provable.Array(
    RollupMerkleTreeWitness,
    constants.stateTransitionProverBatchSize
  ),
}) {}

// export class STProverBoolArray extends Struct({
//   values: Provable.Array(Bool, constants.stateTransitionProverBatchSize),
// }) {}

// TODO Name
export class ProvableStateTransitionInformation extends Struct({
  stateTransition: ProvableStateTransition,
  type: ProvableStateTransitionType,
  witnessRoot: Bool,
}) {
  public static dummy(): ProvableStateTransitionInformation {
    return {
      stateTransition: ProvableStateTransition.dummy(),
      type: ProvableStateTransitionType.nothing,
      witnessRoot: Bool(false),
    };
  }
}

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
    ProvableStateTransitionInformation,
    constants.stateTransitionProverBatchSize
  ),
}) {
  // TODO Test
  public static fromBatches(
    batches: {
      stateTransitions: ProvableStateTransition[];
      applied: Bool;
      witnessRoot: Bool;
    }[]
  ): StateTransitionProvableBatch[] {
    const flattened = batches.flatMap((stBatch, i) =>
      stBatch.stateTransitions.map<ProvableStateTransitionInformation>(
        (stateTransition, j, sts) => {
          return {
            stateTransition,
            type:
              // eslint-disable-next-line no-nested-ternary
              j === sts.length - 1
                ? stBatch.applied.toBoolean()
                  ? ProvableStateTransitionType.closeAndApply
                  : ProvableStateTransitionType.closeAndThrowAway
                : ProvableStateTransitionType.nothing,
            witnessRoot:
              j === sts.length - 1 ? stBatch.witnessRoot : Bool(false),
          };
        }
      )
    );

    const values = batch(
      flattened,
      constants.stateTransitionProverBatchSize,
      () => ProvableStateTransitionInformation.dummy()
    );

    return values.map((stBatch) => {
      return new StateTransitionProvableBatch({
        batch: stBatch,
      });
    });
  }
}
