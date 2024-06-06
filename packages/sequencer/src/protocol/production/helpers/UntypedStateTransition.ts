import { Field } from "o1js";
import { ProvableStateTransition, StateTransition } from "@proto-kit/protocol";

import { UntypedOption } from "./UntypedOption";

/**
 * Generic state transition that constraints the current method circuit
 * to external state, by providing a state anchor.
 */
export class UntypedStateTransition {
  public static fromStateTransition<Value>(st: StateTransition<Value>) {
    return new UntypedStateTransition(
      st.path,
      UntypedOption.fromOption(st.fromValue),
      UntypedOption.fromOption(st.toValue)
    );
  }

  public static fromJSON({
    path,
    from,
    to,
  }: {
    path: string;
    from: Parameters<typeof UntypedOption.fromJSON>[0];
    to: Parameters<typeof UntypedOption.fromJSON>[0];
  }): UntypedStateTransition {
    return new UntypedStateTransition(
      Field(path),
      UntypedOption.fromJSON(from),
      UntypedOption.fromJSON(to)
    );
  }

  public constructor(
    public path: Field,
    public fromValue: UntypedOption,
    public toValue: UntypedOption
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
      from: this.fromValue.toJSON(),
      to: this.toValue.toJSON(),
    };
  }
}
