/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable import/prefer-default-export */
import type { FlexibleProvablePure } from 'snarkyjs';

import { Path } from '../path/Path.js';
import type { Option } from '../option/Option.js';

import { State, WithChain, WithPath } from './State.js';
import { Mixin } from 'ts-mixer';

/**
 * Map-like wrapper for state
 */
// eslint-disable-next-line new-cap
export class StateMap<KeyType, ValueType> extends Mixin(WithPath, WithChain) {
  /**
   * Create a new state map with the given key and value types
   *
   * @param keyType - Type to be used as a key
   * @param valueType - Type to be stored as a value
   * @returns State map with provided key and value types.
   */
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

  /**
   * Obtains a value for the provided key in the current state map.
   *
   * @param key - Key to obtain the state for
   * @returns Value for the provided key.
   */
  public get(key: KeyType): Option<ValueType> {
    const state = State.from(this.valueType);
    this.hasPathOrFail();
    this.hasChainOrFail();

    state.path = Path.fromKey(this.path, this.keyType, key);
    state.chain = this.chain;
    return state.get();
  }

  /**
   * Sets a value for the given key in the current state map.
   *
   * @param key - Key to store the value under
   * @param value - Value to be stored under the given key
   */
  public set(key: KeyType, value: ValueType) {
    const state = State.from(this.valueType);
    this.hasPathOrFail();
    this.hasChainOrFail();

    state.path = Path.fromKey(this.path, this.keyType, key);
    state.chain = this.chain;
    state.set(value);
  }
}
