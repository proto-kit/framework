/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-unused-modules */
import { Field, FlexibleProvablePure } from 'snarkyjs';
import { State, WithPath } from './State.js';
import { Path } from '../path/Path.js';
import { Option } from '../option/Option';
import { ProvableStateTransition } from '../stateTransition/StateTransition';

export class StateMap<KeyType, ValueType> extends WithPath {
  public static from<KeyType, ValueType>(
    keyType: FlexibleProvablePure<KeyType>,
    valueType: FlexibleProvablePure<ValueType>
  ) {
    return new StateMap<KeyType, ValueType>(keyType, valueType);
  }

  public constructor(
    public keyType: FlexibleProvablePure<KeyType>,
    public valueType: FlexibleProvablePure<ValueType>
  ) {
    super();
  }

  public get(key: KeyType): [Option<ValueType>, ProvableStateTransition] {
    const state = State.from(this.valueType);
    this.hasPathOrFail();

    state.path = Path.fromKey(this.path, this.keyType, key);
    return state.get();
  }

  public set(key: KeyType, value: ValueType): ProvableStateTransition {
    const state = State.from(this.valueType);
    this.hasPathOrFail();

    state.path = Path.fromKey(this.path, this.keyType, key);
    return state.set(value);
  }
}
