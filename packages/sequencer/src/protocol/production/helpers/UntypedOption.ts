import { Bool, Field, Poseidon } from "o1js";
import { Option, OptionBase } from "@proto-kit/protocol";

/**
 * Option facilitating in-circuit values that may or may not exist.
 */
export class UntypedOption {
  public constructor(
    public isSome: boolean,
    public value: string[],
    public isForcedSome: boolean
  ) {}

  public get treeValue() {
    const treeValue = Poseidon.hash(this.encodeValueToFields());

    if(this.isSome && !this.isForcedSome){
      return treeValue.toString();
    }
    return "0";
  } 

  public static fromOption<Value>(option: Option<Value> | Option<Field>) {
    return new UntypedOption(
      option.isSome.toBoolean(),
      option.encodeValueToFields().map((f) => f.toString()),
      option.isForcedSome.toBoolean()
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
    return new UntypedOption(isSome, value, isForcedSome);
  }

  public toJSON(){
    return {
        isSome: this.isSome,
        value: this.value,
        isForcedSome: this.isForcedSome
    };
  }

  public clone() {
    return new UntypedOption(this.isSome, this.value, this.isForcedSome);
  }

  public encodeValueToFields(): Field[] {
    return this.value.map((fieldString) => Field(fieldString))
  }
}