/* eslint-disable import/prefer-default-export */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { type Field, type FlexibleProvablePure, Poseidon } from 'snarkyjs';

export class HashList<Value> {
  public static fromFields<Value>(
    valueType: FlexibleProvablePure<Value>,
    value: Value
  ) {
    const hash = Poseidon.hash(valueType.toFields(value));
    return new HashList(valueType, hash);
  }

  public constructor(
    public valueType: FlexibleProvablePure<Value>,
    public hash: Field
  ) {}

  public push(value: Value) {
    this.hash = Poseidon.hash([this.hash, ...this.valueType.toFields(value)]);
    return this;
  }

  public toField() {
    return this.hash;
  }
}
