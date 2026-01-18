import { Bool, Field } from "o1js";
import { ProvableOption, ProvableStateTransition, StateTransition } from "@proto-kit/protocol";

import { UntypedOption } from "./UntypedOption";

/**
 * Generic state transition that constraints the current method circuit
 * to external state, by providing a state anchor.
 */
export class UntypedStateTransition {
  public static fromStateTransition<Value>(st: StateTransition<Value>) {
    return new UntypedStateTransition(
      st.path.toString(),
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
      path,
      UntypedOption.fromJSON(from),
      UntypedOption.fromJSON(to)
    );
  }

  public constructor(
    public path: string,
    public from: UntypedOption,
    public to: UntypedOption
  ) {}

  public toJSON() {
    return {
      path: this.path,
      from: this.from.toJSON(),
      to: this.to.toJSON(),
    };
  }

  public toProvable(): ProvableStateTransition {
    return new ProvableStateTransition({
      path: Field(this.path),
      from: new ProvableOption({
        isSome: Bool(this.from.isSome),
        value: Field(this.from.treeValue),
      }),
      to: new ProvableOption({
        isSome: Bool(this.to.isSome),
        value: Field(this.to.treeValue),
      }),
    });
  }
}

