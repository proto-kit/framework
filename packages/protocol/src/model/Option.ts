import {
  Bool,
  Field,
  type FlexibleProvablePure,
  Poseidon,
  Provable,
  Struct,
} from "o1js";

export class ProvableOption extends Struct({
  isSome: Bool,
  value: Field,
}) {
  public toSome() {
    this.isSome = Bool(true);
    return this;
  }
}

export abstract class OptionBase {
  protected constructor(public isSome: Bool, public enforceEmpty: Bool) {}

  protected abstract encodeValueToFields(): Field[];

  protected abstract clone(): OptionBase;

  /**
   * @returns Tree representation of the current value
   */
  public get treeValue() {
    const treeValue = Poseidon.hash(this.encodeValueToFields());

    // We only return the value if enforceEmpty is false
    // If it is true, we return 0, since enforceEmpty will only be set
    // if isSome: true and the value: some dummy value
    return Provable.if(this.enforceEmpty, Field(0), treeValue);
  }

  /**
   * Returns the `to`-value as decoded as a list of fields
   * Not in circuit
   */
  public toFields(): Field[] {
    if (this.isSome.toBoolean()) {
      return this.encodeValueToFields();
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
    const value = this.encodeValueToFields().map((field) => field.toString());

    return {
      isSome: this.isSome.toBoolean(),
      enforceEmpty: this.enforceEmpty.toBoolean(),
      value,
    };
  }
}

/**
 * Option facilitating in-circuit values that may or may not exist.
 */
export class Option<Value> extends OptionBase {
  /**
   * Creates a new Option from the provided parameters
   *
   * @param isSome
   * @param value
   * @param enforceEmpty
   * @param valueType
   * @returns New option from the provided parameters.
   */
  public static from<Value>(
    isSome: Bool,
    value: Value,
    enforceEmpty: Bool,
    valueType: FlexibleProvablePure<Value>
  ) {
    return new Option(isSome, value, valueType, enforceEmpty);
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
    return this.from(Bool(true), value, Bool(false), valueType);
  }

  /**
   * @returns Empty / none option
   */
  public static none() {
    return new Option(Bool(false), Field(0), Field);
  }

  public constructor(
    isSome: Bool,
    public value: Value,
    public valueType: FlexibleProvablePure<Value>,
    enforceEmpty = Bool(false)
  ) {
    super(isSome, enforceEmpty);
  }

  public encodeValueToFields(): Field[] {
    return this.valueType.toFields(this.value);
  }

  public clone(): Option<Value> {
    return new Option(
      this.isSome,
      this.value,
      this.valueType,
      this.enforceEmpty
    );
  }

  /**
   * @returns Returns the value of this option if it isSome,
   * otherwise returns the given defaultValue
   */
  public orElse(defaultValue: Value): Value {
    return Provable.if<Value>(
      this.isSome,
      this.valueType,
      this.value,
      defaultValue
    );
  }
}
