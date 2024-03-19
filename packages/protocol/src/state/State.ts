import { Mixin } from "ts-mixer";
import { Bool, Field, Provable, type FlexibleProvablePure } from "o1js";
import { container } from "tsyringe";
import { dummyValue } from "@proto-kit/common";

import { Path } from "../model/Path";
import { Option } from "../model/Option";
import { StateTransition } from "../model/StateTransition";

import { StateServiceProvider } from "./StateServiceProvider";
import { RuntimeMethodExecutionContext } from "./context/RuntimeMethodExecutionContext";

export class WithPath {
  public path?: Field;

  public hasPathOrFail(): asserts this is { path: Path } {
    if (!this.path) {
      throw new Error(
        "Could not find 'path', did you forget to add '@state' to your state property?"
      );
    }
  }
}

export class WithStateServiceProvider {
  public stateServiceProvider?: StateServiceProvider;

  public hasStateServiceOrFail(): asserts this is {
    stateServiceProvider: StateServiceProvider;
  } {
    if (!this.stateServiceProvider) {
      throw new Error(
        "Could not find 'stateServiceProvider', did you forget to add '@state' to your state property?"
      );
    }
  }
}

/**
 * Utilities for runtime module state, such as get/set
 */
export class State<Value> extends Mixin(WithPath, WithStateServiceProvider) {
  /**
   * Creates a new state wrapper for the provided value type.
   *
   * @param valueType - Type of value to be stored (e.g. UInt64, Struct, ...)
   * @returns New state for the given value type.
   */
  public static from<Value>(valueType: FlexibleProvablePure<Value>) {
    return new State<Value>(valueType);
  }

  public constructor(public valueType: FlexibleProvablePure<Value>) {
    super();
  }

  /**
   * Returns the state that is currently the current state tree
   * value: The value-fields, or if not state was found, dummy values
   * isSome: Whether the values where found in the state or not
   * (Basically, whether the value-fields are dummy values or actual values
   * @private
   */
  private getState(): { value: Value; isSome: Bool } {
    this.hasStateServiceOrFail();
    this.hasPathOrFail();

    const { path, stateServiceProvider, valueType } = this;

    const { stateTransitions } = container
      .resolve(RuntimeMethodExecutionContext)
      .current().result;

    // First try to find a match inside already created stateTransitions
    let previousMutatingTransitions: StateTransition<any>[] = [];
    previousMutatingTransitions = stateTransitions.filter((transition) =>
      transition.path.equals(path).and(transition.to.isSome).toBoolean()
    );
    const pmtLength = previousMutatingTransitions.length;

    let value =
      pmtLength > 0
        ? // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          (previousMutatingTransitions[pmtLength - 1].to.value as Value)
        : undefined;

    if (value !== undefined) {
      return { value, isSome: Bool(true) };
    }

    // If the value is still undefined, look it up in the stateService
    const fields = stateServiceProvider.stateService.get(path);
    if (fields) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      value = valueType.fromFields(fields) as Value;
    }

    if (value !== undefined) {
      return { value, isSome: Bool(true) };
    }
    return { value: dummyValue(valueType), isSome: Bool(false) };
  }

  /**
   * Provides an in-circuit witness for the current state representation,
   * and constructs an Option out of it.
   *
   * @returns Optional value of the current state
   */
  private witnessFromState() {
    // get the value from storage, or return a dummy value instead
    const value = Provable.witness(this.valueType, () => this.getState().value);

    // check if the value exists in the storage or not
    const isSome = Provable.witness(Bool, () => this.getState().isSome);

    return Option.from(isSome, value, this.valueType);
  }

  /**
   * Retrieves the current state and creates a state transition
   * anchoring the use of the current state value in the circuit.
   *
   * @returns Option representation of the current state.
   */
  public get(): Option<Value> {
    const option = this.witnessFromState();

    this.hasPathOrFail();

    const stateTransition = StateTransition.from(this.path, option);

    container
      .resolve(RuntimeMethodExecutionContext)
      .addStateTransition(stateTransition);

    return option;
  }

  /**
   * Sets a new state value by creating a state transition from
   * the current value to the newly set value.
   *
   * The newly set value isn't available via state.get(), since the
   * state transitions are not applied within the same circuit.
   * You can however store and access your new value in
   * a separate circuit variable.
   *
   * @param value - Value to be set as the current state
   */
  public set(value: Value) {
    // link the transition to the current state
    const fromOption = this.witnessFromState();
    const toOption = Option.fromValue(value, this.valueType);

    this.hasPathOrFail();

    const stateTransition = StateTransition.fromTo(
      this.path,
      fromOption,
      toOption
    );

    container
      .resolve(RuntimeMethodExecutionContext)
      .addStateTransition(stateTransition);
  }
}
