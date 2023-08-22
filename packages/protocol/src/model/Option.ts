import {
  Bool,
  Field,
  type FlexibleProvablePure,
  Poseidon,
  Provable,
  Struct,
} from "snarkyjs";

export class ProvableOption extends Struct({
  isSome: Bool,
  value: Field,
}) {
  public toSome() {
    this.isSome = Bool(true);
    return this;
  }
}

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

  public static dummyValueFields<Value>(
    valueType: FlexibleProvablePure<Value>
  ): Field[] {
    const length = valueType.sizeInFields();
    return Array.from({ length }, () => Field(0));
  }

  /**
   * Computes a dummy value for the given value type.
   *
   * @param valueType - Value type to generate the dummy value for
   * @returns Dummy value for the given value type
   */
  public static dummyValue<Value>(
    valueType: FlexibleProvablePure<Value>
  ): Value {
    const fields = Option.dummyValueFields(valueType);

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return valueType.fromFields(fields) as Value;
  }

  public isForcedSome = Bool(false);

  public constructor(
    public isSome: Bool,
    public value: Value,
    public valueType: FlexibleProvablePure<Value>
  ) {}

  public clone() {
    return new Option(this.isSome, this.value, this.valueType);
  }

  public forceSome() {
    this.isForcedSome = Provable.if(this.isSome, Bool(false), Bool(true));
    this.isSome = Bool(true);
  }

  /**
   * @returns Tree representation of the current value
   */
  public get treeValue() {
    const treeValue = Poseidon.hash(this.valueType.toFields(this.value));

    return Provable.if(
      this.isSome.and(this.isForcedSome.not()),
      treeValue,
      Field(0)
    );
  }

  /**
   * Returns the `to`-value as decoded as a list of fields
   * Not in circuit
   */
  public toFields(): Field[] {
    if (this.isSome.toBoolean()) {
      return this.valueType.toFields(this.value);
    }
    return [Field(0)];
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

  public toJSON() {
    return {
      isSome: this.isSome.toBoolean(),
      value: `[${this.valueType
        .toFields(this.value)
        .map((field) => field.toString())
        .reduce((a, b) => `${a}, ${b}`)}]`,
    };
  }
}
