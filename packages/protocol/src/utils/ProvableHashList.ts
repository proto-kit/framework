import {
  Field,
  Poseidon,
  Bool,
  Provable,
  ProvablePure,
  Unconstrained,
} from "o1js";

import { NonMethods } from "./utils";

export type ProvableHashListData<Value> = {
  preimage: Field;
  value: NonMethods<Value>;
};

export type VerifiedTransition<T> = {
  from: T;
  to: T;
};

/**
 * Utilities for creating a hash list from a given value type.
 */
export abstract class ProvableHashList<Value> {
  public commitment: Field;

  public constructor(
    protected readonly valueType: ProvablePure<Value>,
    commitment?: Field | undefined,
    private unconstrainedList: Unconstrained<
      ProvableHashListData<Value>[]
    > = Unconstrained.from([])
  ) {
    this.commitment = commitment ?? this.empty();
  }

  protected abstract empty(): Field;

  protected abstract hash(elements: Field[]): Field;

  private pushUnconstrained(preimage: Field, value: Value) {
    this.unconstrainedList.updateAsProver((array) => {
      return [
        ...array,
        {
          preimage: preimage.toConstant(),
          value: Provable.toConstant(this.valueType, value),
        },
      ];
    });
  }

  /**
   * Fast-forwards the state of the hashlist to a specified new tip.
   * This assumes the transition (from -> to) to be already verified somewhere
   * else that is outside this scope.
   */
  public fastForward(
    transition: VerifiedTransition<Field>,
    message: string = "some hashlist"
  ) {
    const { from, to } = transition;
    from.assertEquals(
      this.commitment,
      `From-commitment for ${message} not matching`
    );

    this.commitment = to;
  }

  public fastForwardIf(
    transition: VerifiedTransition<Field>,
    condition: Bool,
    message: string = "some hashlist"
  ) {
    const { from, to } = transition;

    condition
      .implies(from.equals(this.commitment))
      .assertTrue(`From-commitment for ${message} not matching`);

    this.commitment = Provable.if(condition, to, this.commitment);
  }

  public witnessTip(preimage: Field, value: Value): Bool {
    return this.hash([preimage, ...this.valueType.toFields(value)]).equals(
      this.commitment
    );
  }

  /**
   * Converts the provided value to Field[] and appends it to
   * the current hashlist.
   *
   * @param value - Value to be appended to the hash list
   * @returns Current hash list.
   */
  public push(value: Value) {
    Provable.asProver(() => {
      this.pushUnconstrained(this.commitment, value);
    });

    this.commitment = this.hash([
      this.commitment,
      ...this.valueType.toFields(value),
    ]);

    return this;
  }

  public pushIf(value: Value, condition: Bool) {
    Provable.asProver(() => {
      if (condition.toBoolean()) {
        this.pushUnconstrained(this.commitment, value);
      }
    });

    const newCommitment = this.hash([
      this.commitment,
      ...this.valueType.toFields(value),
    ]);
    this.commitment = Provable.if(condition, newCommitment, this.commitment);

    return this;
  }

  /**
   * @returns Traling hash of the current hashlist.
   */
  public toField() {
    return this.commitment;
  }

  public isEmpty(): Bool {
    return this.commitment.equals(this.empty());
  }

  public getUnconstrainedValues(): Unconstrained<
    ProvableHashListData<Value>[]
  > {
    return this.unconstrainedList;
  }
}

export class DefaultProvableHashList<Value> extends ProvableHashList<Value> {
  public hash(elements: Field[]): Field {
    return Poseidon.hash(elements);
  }

  public empty(): Field {
    return Field(0);
  }
}
