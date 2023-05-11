/* eslint-disable new-cap */
/* eslint-disable import/prefer-default-export */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { Field, type FlexibleProvablePure, Poseidon, Circuit } from 'snarkyjs';

/**
 * Utilities for creating a hash list from a given value type.
 */
export class HashList<Value> {
  public static fromType<Value>(valueType: FlexibleProvablePure<Value>) {
    return new HashList(valueType);
  }

  public hash: Field = Field(0);

  public constructor(public valueType: FlexibleProvablePure<Value>) {}

  /**
   * Converts the provided value to Field[] and appends it to
   * the current hashlist.
   *
   * @param value - Value to be appended to the hash list
   * @returns Current hash list.
   */
  public push(value: Value) {
    this.hash = Poseidon.hash([this.hash, ...this.valueType.toFields(value)]);
    return this;
  }

  /**
   * @returns Traling hash of the current hashlist.
   */
  public toField() {
    return this.hash;
  }
}
