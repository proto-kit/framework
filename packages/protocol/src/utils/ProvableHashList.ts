import { Field, Poseidon, Bool, Provable, ProvablePure } from "o1js";
import { NonMethods } from "./utils";

/**
 * Utilities for creating a hash list from a given value type.
 */
export abstract class ProvableHashList<Value> {
  private readonly unconstrainedList: NonMethods<Value>[] = [];

  public constructor(
    protected readonly valueType: ProvablePure<Value>,
    public commitment: Field = Field(0)
  ) {}

  protected abstract hash(elements: Field[]): Field;

  private pushUnconstrained(value: Value) {
    const valueConstant = this.valueType.fromFields(
      this.valueType.toFields(value).map((field) => field.toConstant())
    );
    this.unconstrainedList.push(valueConstant);
  }

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

    Provable.asProver(() => {
      this.pushUnconstrained(value);
    });

    return this;
  }

  public pushIf(value: Value, condition: Bool) {
    const newCommitment = this.hash([
      this.commitment,
      ...this.valueType.toFields(value),
    ]);
    this.commitment = Provable.if(condition, newCommitment, this.commitment);

    Provable.asProver(() => {
      if (condition.toBoolean()) {
        this.pushUnconstrained(value);
      }
    });

    return this;
  }

  /**
   * @returns Traling hash of the current hashlist.
   */
  public toField() {
    return this.commitment;
  }

  public getUnconstrainedValues(): NonMethods<Value>[] {
    return this.unconstrainedList;
  }
}

export class DefaultProvableHashList<Value> extends ProvableHashList<Value> {
  public hash(elements: Field[]): Field {
    return Poseidon.hash(elements);
  }
}
