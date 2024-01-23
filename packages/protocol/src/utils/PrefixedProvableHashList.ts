import { Field, FlexibleProvablePure, Poseidon } from "o1js";

import { ProvableHashList } from "./ProvableHashList.js";
import { stringToField } from "./utils";

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

  protected hash(elements: Field[]): Field {
    return Poseidon.hash([this.prefix, ...elements]);
  }
}

let encoder = new TextEncoder();

// Copied from o1js binable.ts:317
function prefixToField(prefix: string): Field {
  let fieldSize = Field.sizeInBytes();
  if (prefix.length >= fieldSize) throw Error("prefix too long");
  let stringBytes = [...encoder.encode(prefix)];
  return Field.fromBytes(
    stringBytes.concat(Array(fieldSize - stringBytes.length).fill(0))
  );
}

export class MinaPrefixedProvableHashList<
  Value
> extends ProvableHashList<Value> {
  public constructor(
    valueType: FlexibleProvablePure<Value>,
    public readonly prefix: string,
    internalCommitment: Field = Field(0)
  ) {
    super(valueType, internalCommitment);
  }

  protected hash(elements: Field[]): Field {
    const salt = Poseidon.update(
      [Field(0), Field(0), Field(0)],
      [prefixToField(this.prefix)]
    ) as [Field, Field, Field];

    const digest = Poseidon.update(salt, elements);
    return digest[0];
  }
}
