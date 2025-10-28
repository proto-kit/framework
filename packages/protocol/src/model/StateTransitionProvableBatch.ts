import { Bool, Field, Provable, Struct } from "o1js";
import { batch, LinkedMerkleTreeWitness } from "@proto-kit/common";

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

  public isNothing() {
    return this.type.equals(ProvableStateTransitionType.nothing.type);
  }
}

export class MerkleWitnessBatch extends Struct({
  witnesses: Provable.Array(
    LinkedMerkleTreeWitness,
    constants.stateTransitionProverBatchSize
  ),
}) {}

export class ProvableStateTransitionEntry extends Struct({
  stateTransition: ProvableStateTransition,
  type: ProvableStateTransitionType,
  witnessRoot: Bool,
}) {
  public static dummy(): ProvableStateTransitionEntry {
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
 * The batch is formed as an array fo ProvableSTEntries, which have a type and
 * witnessesRoot flag attached to them.
 */
export class StateTransitionProvableBatch extends Struct({
  batch: Provable.Array(
    ProvableStateTransitionEntry,
    constants.stateTransitionProverBatchSize
  ),
}) {
  public static fromBatches(
    batches: {
      stateTransitions: ProvableStateTransition[];
      applied: Bool;
      witnessRoot: Bool;
    }[]
  ): StateTransitionProvableBatch[] {
    const flattened: ProvableStateTransitionEntry[] = [];

    for (const stBatch of batches) {
      const entries =
        stBatch.stateTransitions.map<ProvableStateTransitionEntry>(
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
              witnessRoot: Bool(false),
            };
          }
        );

      flattened.push(...entries);

      if (stBatch.witnessRoot.toBoolean() && flattened.length > 0) {
        flattened.at(-1)!.witnessRoot = Bool(true);
      }
    }

    const values = batch(
      flattened,
      constants.stateTransitionProverBatchSize,
      () => ProvableStateTransitionEntry.dummy()
    );

    return values.map((stBatch) => {
      return new StateTransitionProvableBatch({
        batch: stBatch,
      });
    });
  }
}
