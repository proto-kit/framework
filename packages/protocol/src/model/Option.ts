import {
  Bool,
  Circuit,
  Field,
  type FlexibleProvablePure,
  Poseidon,
  Struct,
} from "snarkyjs";

export class ProvableOption extends Struct({
  isSome: Bool,
  value: Field,
}) {}

/**
 * Option facilitating in-circuit values that may or may not exist.
 */
export class Option<Value> {
  /**
   * Creates a new Option from the provided parameters
   *
   * @param isSome
   * @param value
   * @param valueType
   * @returns New option from the provided parameters.
   */
  public static from<Value>(
    isSome: Bool,
    value: Value,
    valueType: FlexibleProvablePure<Value>
  ) {
    return new Option(isSome, value, valueType);
  }

  /**
   * Creates a new Option from the provided parameters
   *
   * @param value
   * @param valueType
   * @returns New option from the provided parameters.
   */
  public static fromValue<Value>(
    value: Value,
    valueType: FlexibleProvablePure<Value>
  ) {
    return this.from(Bool(true), value, valueType);
  }

  /**
   * @returns Empty / none option
   */
  public static none() {
    return new Option(Bool(false), Field(0), Field);
  }

  public constructor(
    public isSome: Bool,
    public value: Value,
    public valueType: FlexibleProvablePure<Value>
  ) {}

  /**
   * @returns Tree representation of the current value
   */
  public get treeValue() {
    const treeValue = Poseidon.hash(this.valueType.toFields(this.value));

    // if the sequencer claims the value is `None`,
    // then we use Field(0) as the treeValue so it can be proven later
    return Circuit.if(this.isSome, treeValue, Field(0));
  }

  /**
   * @returns Provable representation of the current option.
   */
  public toProvable() {
    return new ProvableOption({
      isSome: this.isSome,
      value: this.treeValue,
    });
  }
}
