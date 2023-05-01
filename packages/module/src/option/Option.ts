/* eslint-disable import/no-unused-modules */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */
/* eslint-disable max-classes-per-file */
import {
  Bool,
  Circuit,
  Field,
  FlexibleProvablePure,
  Poseidon,
  Struct,
} from 'snarkyjs';

export class ProvableOption extends Struct({
  isSome: Bool,
  value: Field,
}) {}

export class Option<Value> {
  public static from<Value>(
    isSome: Bool,
    value: Value,
    valueType: FlexibleProvablePure<Value>
  ) {
    return new Option(isSome, value, valueType);
  }

  public static none() {
    return new Option(Bool(false), Field(0), Field);
  }

  public constructor(
    public isSome: Bool,
    public value: Value,
    public valueType: FlexibleProvablePure<Value>
  ) {}

  public get treeValue() {
    const treeValue = Poseidon.hash(this.valueType.toFields(this.value));

    // if the sequencer claims the value is `None`,
    // then we use Field(0) as the treeValue so it can be proven later
    return Circuit.if(this.isSome, treeValue, Field(0));
  }

  public toProvable() {
    return new ProvableOption({
      isSome: this.isSome,
      value: this.treeValue,
    });
  }
}
