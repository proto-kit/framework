import type { Bool, Field, FlexibleProvablePure } from "o1js";
import { Mixin } from "ts-mixer";

import { Path } from "../model/Path";

import { State, WithStateServiceProvider, WithPath } from "./State";

/**
 * Map-like wrapper for state
 */
export class AppendOnlyStateSet<ValueType> extends Mixin(
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
  public static from<ValueType>(
    valueType: FlexibleProvablePure<ValueType>
  ): AppendOnlyStateSet<ValueType> {
    return new AppendOnlyStateSet<ValueType>(valueType);
  }

  public constructor(public valueType: FlexibleProvablePure<ValueType>) {
    super();
  }

  public getPath(value: ValueType): Field {
    this.hasPathOrFail();
    return Path.fromKey(this.path, this.valueType, value);
  }

  // TODO has? includes?
  public async contains(value: ValueType): Promise<Bool> {
    // TODO This does a unnecessary hashing step to determine the leaf value.
    //  We would be fine with just storing a Bool here, but that means writing a
    //  custom variant of `State`
    const state = State.from(this.valueType);
    this.hasPathOrFail();
    this.hasStateServiceOrFail();

    state.path = this.getPath(value);
    state.stateServiceProvider = this.stateServiceProvider;
    const stateValue = await state.get();
    return stateValue.isSome;
  }

  private async add(value: ValueType): Promise<void> {
    const state = State.from(this.valueType);
    this.hasPathOrFail();
    this.hasStateServiceOrFail();

    state.path = this.getPath(value);
    state.stateServiceProvider = this.stateServiceProvider;

    return await state.set(value);
  }

  // TODO Adding a remove would require State.delete()
}
