/* eslint-disable new-cap */
/* eslint-disable import/prefer-default-export */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { Field, type FlexibleProvablePure, Poseidon } from 'snarkyjs';

export class HashList<Value> {
  public static fromType<Value>(valueType: FlexibleProvablePure<Value>) {
    return new HashList(valueType);
  }

  public hash: Field = Field(0);

  public constructor(public valueType: FlexibleProvablePure<Value>) {}

  public push(value: Value) {
    this.hash = Poseidon.hash([this.hash, ...this.valueType.toFields(value)]);
    return this;
  }

  public toField() {
    return this.hash;
  }
}
