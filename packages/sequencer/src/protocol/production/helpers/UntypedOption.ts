import { Bool, Field } from "o1js";
import { Option, OptionBase } from "@proto-kit/protocol";

/**
 * Option facilitating in-circuit values that may or may not exist.
 */
export class UntypedOption extends OptionBase {
  public static fromOption<Value>(option: Option<Value> | Option<Field>) {
    return new UntypedOption(
      option.isSome,
      option.encodeValueToFields(),
      option.isForcedSome
    );
  }

  public static fromJSON({
    isSome,
    value,
    isForcedSome,
  }: {
    isSome: boolean;
    value: string[];
    isForcedSome: boolean;
  }): UntypedOption {
    return new UntypedOption(
      Bool(isSome),
      value.map((fieldString) => Field(fieldString)),
      Bool(isForcedSome)
    );
  }

  public constructor(
    isSome: Bool,
    public value: Field[],
    enforceEmpty: Bool
  ) {
    super(isSome, enforceEmpty);
  }

  public clone() {
    return new UntypedOption(this.isSome, this.value, this.isForcedSome);
  }

  protected encodeValueToFields(): Field[] {
    return this.value;
  }
}
