import { Field, FlexibleProvablePure, Poseidon } from "snarkyjs";
import { TextEncoder } from "node:util";
import { ProvableHashList } from "./ProvableHashList.js";

export class PrefixedProvableHashList<Value> extends ProvableHashList<Value> {

  private readonly prefix: Field;

  public constructor(
    valueType: FlexibleProvablePure<Value>,
    prefix: string,
    internalCommitment: Field = Field(0)
  ) {
    super(valueType, internalCommitment);
    this.prefix = prefixToField(prefix);
  }

  protected hash(e: Field[]): Field {
    return Poseidon.hash([this.prefix, ...e]);
  }

}


export function prefixToField(prefix: string) {
  const fieldSize = Field.sizeInBytes();
  if (prefix.length >= fieldSize) {
    throw new Error('prefix too long');
  }

  const encoder = new TextEncoder();
  function stringToBytes(s: string) : number[] {
    return Array.from(encoder.encode(s));
  }

  const stringBytes = stringToBytes(prefix);

  const padding = Array.from<number>({ length: fieldSize - stringBytes.length }).fill(0)
  const data = stringBytes.concat(padding)

  return Field.fromBytes(
    data
  );
}
