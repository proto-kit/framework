import { Field, Struct } from "snarkyjs";

import { Option, ProvableOption } from "./Option.js";

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
export class StateTransition<Value> {
  public static from<Value>(path: Field, from: Option<Value>) {
    return new StateTransition(path, from, Option.none());
  }

  public static fromTo<Value>(path: Field, from: Option<Field> | Option<Value>, to: Option<Field> | Option<Value>, toValue: Value) {
    return new StateTransition(path, from, to, toValue);
  }

  public constructor(
    public path: Field,
    public from: Option<Field> | Option<Value>,
    public to: Option<Field> | Option<Value>,
    public toValue?: Value
  ) {}

  public toProvable(): ProvableStateTransition {
    return new ProvableStateTransition({
      path: this.path,
      from: this.from.toProvable(),
      to: this.to.toProvable(),
    });
  }
}
