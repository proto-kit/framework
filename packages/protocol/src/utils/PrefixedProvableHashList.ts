import { Field, FlexibleProvablePure, Poseidon } from "o1js";
import { prefixToField } from "@proto-kit/common";

import { ProvableHashList } from "./ProvableHashList.js";
import { stringToField } from "./utils";

export class PrefixedProvableHashList<Value> extends ProvableHashList<Value> {
  private readonly prefix: Field;

  public constructor(
    valueType: FlexibleProvablePure<Value>,
    prefix: string,
    internalCommitment: Field = Field(0)
  ) {
    super(valueType, internalCommitment);
    this.prefix = stringToField(prefix);
  }

  protected hash(elements: Field[]): Field {
    return Poseidon.hash([this.prefix, ...elements]);
  }
}

function salt(prefix: string) {
  return Poseidon.update(
    [Field(0), Field(0), Field(0)],
    [prefixToField(prefix)]
  ) as [Field, Field, Field];
}

export const MINA_EVENT_PREFIXES = {
  event: "MinaZkappEvent******",
  events: "MinaZkappEvents*****",
  sequenceEvents: "MinaZkappSeqEvents**",
};

export function emptyActions(): Field {
  return salt("MinaZkappActionsEmpty")[0];
}

export function emptyEvents(): Field {
  return salt("MinaZkappEventsEmpty")[0];
}

export class MinaPrefixedProvableHashList<
  Value
> extends ProvableHashList<Value> {
  public constructor(
    valueType: FlexibleProvablePure<Value>,
    public readonly prefix: string,
    internalCommitment: Field = Field(0)
  ) {
    super(valueType, internalCommitment);
  }

  protected hash(elements: Field[]): Field {
    const init = salt(this.prefix);
    const digest = Poseidon.update(init, elements);
    return digest[0];
  }
}
