/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable import/prefer-default-export */
import type { FlexibleProvablePure } from 'snarkyjs';

import { Path } from '../path/Path.js';
import type { Option } from '../option/Option.js';

import { State, WithChain, WithPath } from './State.js';
import { Mixin } from 'ts-mixer';

// eslint-disable-next-line new-cap
export class StateMap<KeyType, ValueType> extends Mixin(WithPath, WithChain) {
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

  public get(key: KeyType): Option<ValueType> {
    const state = State.from(this.valueType);
    this.hasPathOrFail();
    this.hasChainOrFail();

    state.path = Path.fromKey(this.path, this.keyType, key);
    state.chain = this.chain;
    return state.get();
  }

  public set(key: KeyType, value: ValueType) {
    const state = State.from(this.valueType);
    this.hasPathOrFail();
    this.hasChainOrFail();

    state.path = Path.fromKey(this.path, this.keyType, key);
    state.chain = this.chain;
    state.set(value);
  }
}
