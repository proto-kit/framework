import { Field, ProvablePure, Poseidon } from "o1js";

import { ProvableHashList } from "./ProvableHashList.js";
import { stringToField } from "./utils";

export class PrefixedProvableHashList<Value> extends ProvableHashList<Value> {
  private readonly prefix: Field;

  public constructor(
    valueType: ProvablePure<Value>,
    prefix: string,
    internalCommitment: Field = Field(0)
  ) {
    super(valueType, internalCommitment);
    this.prefix = stringToField(prefix);
  }

  protected hash(elements: Field[]): Field {
    return Poseidon.hash([this.prefix, ...elements]);
  }
}
