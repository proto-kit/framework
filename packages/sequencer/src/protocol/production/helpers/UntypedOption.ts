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
      option.enforceEmpty
    );
  }

  public static fromJSON({
    isSome,
    value,
    enforceEmpty,
  }: {
    isSome: boolean;
    value: string[];
    enforceEmpty: boolean;
  }): UntypedOption {
    return new UntypedOption(
      Bool(isSome),
      value.map((fieldString) => Field(fieldString)),
      Bool(enforceEmpty)
    );
  }

  public constructor(isSome: Bool, public value: Field[], enforceEmpty: Bool) {
    super(isSome, enforceEmpty);
  }

  public clone() {
    return new UntypedOption(this.isSome, this.value, this.enforceEmpty);
  }

  protected encodeValueToFields(): Field[] {
    return this.value;
  }
}
