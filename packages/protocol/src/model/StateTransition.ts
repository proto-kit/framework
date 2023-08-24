import { Field, Struct } from "snarkyjs";

import { Option, ProvableOption, ToFieldable } from "./Option.js";

/**
 * Provable representation of a State Transition, used to
 * normalize state transitions of various value types for
 * the state transition circuit.
 */
export class ProvableStateTransition extends Struct({
  path: Field,

  // must be applied even if `None`
  from: ProvableOption,

  // must be ignored if `None`
  to: ProvableOption,
}) {
  public static dummy(): ProvableStateTransition {
    return new ProvableStateTransition({
      path: Field(0),
      from: Option.none().toProvable(),
      to: Option.none().toProvable(),
    });
  }
}

/**
 * Generic state transition that constraints the current method circuit
 * to external state, by providing a state anchor.
 */
export class StateTransition<Value extends ToFieldable> {
  public static from<Value extends ToFieldable>(
    path: Field,
    fromValue: Option<Value>
  ) {
    return new StateTransition(path, fromValue, Option.none());
  }

  public static fromTo<Value extends ToFieldable>(
    path: Field,
    fromValue: Option<Value>,
    toValue: Option<Value>
  ) {
    return new StateTransition(path, fromValue, toValue);
  }

  public constructor(
    public path: Field,
    public fromValue: Option<Field> | Option<Value>,
    public toValue: Option<Field> | Option<Value>
  ) {}

  public get from() {
    const from = this.fromValue.clone();
    from.forceSome();
    return from;
  }

  public get to() {
    return this.toValue.clone();
  }

  /**
   * Converts a StateTransition to a ProvableStateTransition,
   * while enforcing the 'from' property to be 'Some' in all cases.
   */
  public toProvable(): ProvableStateTransition {
    return new ProvableStateTransition({
      path: this.path,
      from: this.from.toProvable(),
      to: this.to.toProvable(),
    });
  }

  public toJSON() {
    return {
      path: this.path.toString(),
      from: this.from.toJSON(),
      to: this.to.toJSON(),
    };
  }
}
