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

/**
 * Utilities for creating a hash list from a given value type.
 */
export abstract class ProvableHashList<Value> {
  public constructor(
    protected readonly valueType: ProvablePure<Value>,
    public commitment: Field = Field(0),
    private unconstrainedList: Unconstrained<
      ProvableHashListData<Value>[]
    > = Unconstrained.from([])
  ) {}

  protected abstract hash(elements: Field[]): Field;

  private pushUnconstrained(preimage: Field, value: Value) {
    const valueConstant = this.valueType.fromFields(
      this.valueType.toFields(value).map((field) => field.toConstant())
    );
    this.unconstrainedList.get().push({
      preimage: preimage.toConstant(),
      value: valueConstant,
    });
  }

  public witnessTip(preimage: Field, value: Value): Bool {
    return this.hash([
      this.commitment,
      ...this.valueType.toFields(value),
    ]).equals(this.commitment);
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
}
