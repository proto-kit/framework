import { Bool, Field, Poseidon } from "o1js";
import { Option, ProvableOption } from "@proto-kit/protocol";

export class UntypedOption {
  public constructor(
    public isSome: boolean,
    public value: string[],
    public isForcedSome: boolean
  ) {}

  public get treeValue(): string {
    if (this.isSome && !this.isForcedSome) {
      return Poseidon.hash(this.encodeValueToFields()).toString();
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

  public toJSON() {
    return {
      isSome: this.isSome,
      value: this.value,
      isForcedSome: this.isForcedSome,
    };
  }

  public clone() {
    return new UntypedOption(this.isSome, [...this.value], this.isForcedSome);
  }

  public forceSome() {                                                                                                                                                                                       
    this.isForcedSome = !this.isSome;                                                                                                                                                                        
    this.isSome = true;                                                                                                                                                                                      
  }      

  public encodeValueToFields(): Field[] {
    return this.value.map((fieldString) => Field(fieldString));
  }

  public toProvable(): ProvableOption {
    return new ProvableOption({
      isSome: Bool(this.isSome),
      value: Field(this.treeValue),
    });
  }
}