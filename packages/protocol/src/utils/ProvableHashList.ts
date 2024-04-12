import { Field, Poseidon, Bool, Provable, ProvablePure } from "o1js";

/**
 * Utilities for creating a hash list from a given value type.
 */
export abstract class ProvableHashList<Value> {
  public constructor(
    protected readonly valueType: ProvablePure<Value>,
    public commitment: Field = Field(0)
  ) {}

  protected abstract hash(elements: Field[]): Field;

  /**
   * Converts the provided value to Field[] and appends it to
   * the current hashlist.
   *
   * @param value - Value to be appended to the hash list
   * @returns Current hash list.
   */
  public push(value: Value) {
    this.commitment = this.hash([
      this.commitment,
      ...this.valueType.toFields(value),
    ]);
    return this;
  }

  public pushIf(value: Value, condition: Bool) {
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
}

export class DefaultProvableHashList<Value> extends ProvableHashList<Value> {
  public hash(elements: Field[]): Field {
    return Poseidon.hash(elements);
  }
}
