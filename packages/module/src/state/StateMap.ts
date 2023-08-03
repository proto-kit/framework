import type { Field, FlexibleProvablePure } from "snarkyjs";
import { Path, type Option } from "@yab/protocol";
import { Mixin } from "ts-mixer";

import { State, WithRuntime, WithPath } from "./State.js";

/**
 * Map-like wrapper for state
 */
// eslint-disable-next-line new-cap
export class StateMap<KeyType, ValueType> extends Mixin(WithPath, WithRuntime) {
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

  public getPath(key: KeyType): Field {
    this.hasPathOrFail();
    return Path.fromKey(this.path, this.keyType, key);
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
    this.hasRuntimeOrFail();

    state.path = this.getPath(key);
    state.runtime = this.runtime;
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
    this.hasRuntimeOrFail();

    state.path = Path.fromKey(this.path, this.keyType, key);
    state.runtime = this.runtime;
    state.set(value);
  }
}
