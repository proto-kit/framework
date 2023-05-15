import { Field, FlexibleProvablePure, Poseidon } from "snarkyjs";
import { ProvableHashList } from "./ProvableHashList.js";
import { stringToField } from "./Utils";

export class PrefixedProvableHashList<Value> extends ProvableHashList<Value> {

  private readonly prefix: Field;

  public constructor(
    valueType: FlexibleProvablePure<Value>,
    prefix: string,
    internalCommitment: Field = Field(0)
  ) {
    super(valueType, internalCommitment);
    this.prefix = stringToField(prefix);
  }

  protected hash(e: Field[]): Field {
    return Poseidon.hash([this.prefix, ...e]);
  }

}
