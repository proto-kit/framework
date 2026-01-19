import { Field } from "o1js";
import { ProvableStateTransition, StateTransition } from "@proto-kit/protocol";
import { UntypedOption } from "./UntypedOption";

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
    const from = this.from.clone();
    from.forceSome();

    return new ProvableStateTransition({
      path: Field(this.path),
      from: from.toProvable(),
      to: this.to.toProvable(),
    });
  }
}