import type { Field, FlexibleProvablePure } from "o1js";
import { Mixin } from "ts-mixer";

import { Path } from "../model/Path";
import { Option } from "../model/Option";

import { State, WithStateServiceProvider, WithPath } from "./State";

/**
 * Map-like wrapper for state
 */
export class StateMap<KeyType, ValueType> extends Mixin(
  WithPath,
  WithStateServiceProvider
) {
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
  ): StateMap<KeyType, ValueType> {
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
    this.hasStateServiceOrFail();

    state.path = this.getPath(key);
    state.stateServiceProvider = this.stateServiceProvider;
    return state.get();
  }

  /**
   * Sets a value for the given key in the current state map.
   *
   * @param key - Key to store the value under
   * @param value - Value to be stored under the given key
   */
  public set(key: KeyType, value: ValueType): void {
    const state = State.from(this.valueType);
    this.hasPathOrFail();
    this.hasStateServiceOrFail();

    state.path = Path.fromKey(this.path, this.keyType, key);
    state.stateServiceProvider = this.stateServiceProvider;
    state.set(value);
  }
}
