import {
  Bool,
  Field,
  type FlexibleProvablePure,
  Poseidon,
  Provable,
  ProvablePure,
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
  protected constructor(
    public isSome: Bool,
    public isForcedSome: Bool
  ) {}

  protected abstract encodeValueToFields(): Field[];

  protected abstract clone(): OptionBase;

  /**
   * @returns Tree representation of the current value
   */
  public get treeValue() {
    const treeValue = Poseidon.hash(this.encodeValueToFields());

    return Provable.if(
      this.isSome.and(this.isForcedSome.not()),
      treeValue,
      Field(0)
    );
  }

  public forceSome() {
    this.isForcedSome = Provable.if(this.isSome, Bool(false), Bool(true));
    this.isSome = Bool(true);
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
      isForcedSome: this.isForcedSome.toBoolean(),
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
    isSome: Bool,
    public value: Value,
    public valueType: FlexibleProvablePure<Value>,
    isForcedSome = Bool(false)
  ) {
    super(isSome, isForcedSome);
  }

  public encodeValueToFields(): Field[] {
    return this.valueType.toFields(this.value);
  }

  public clone(): Option<Value> {
    return new Option(
      this.isSome,
      this.value,
      this.valueType,
      this.isForcedSome
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

  public toConstant() {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const valueConstant = (this.valueType as ProvablePure<Value>).fromFields(
      this.valueType.toFields(this.value).map((field) => field.toConstant())
    );
    const boolConstant = (bool: Bool) =>
      Bool.fromFields([bool.toField().toConstant()]);

    return new Option(
      boolConstant(this.isSome),
      valueConstant,
      this.valueType,
      boolConstant(this.isForcedSome)
    );
  }
}
