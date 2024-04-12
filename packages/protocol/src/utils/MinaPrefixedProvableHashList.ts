import { Field, Poseidon, ProvablePure } from "o1js";
import { hashWithPrefix, prefixToField } from "@proto-kit/common";

import { ProvableHashList } from "./ProvableHashList";

function salt(prefix: string) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return Poseidon.update(
    [Field(0), Field(0), Field(0)],
    [prefixToField(prefix)]
  ) as [Field, Field, Field];
}

export const MINA_EVENT_PREFIXES = {
  event: "MinaZkappEvent******",
  events: "MinaZkappEvents*****",
  sequenceEvents: "MinaZkappSeqEvents**",
} as const;

export function emptyActions(): Field {
  return salt("MinaZkappActionsEmpty")[0];
}

export function emptyEvents(): Field {
  return salt("MinaZkappEventsEmpty")[0];
}

export class MinaActions {
  static actionHash(
    action: Field[],
    previousHash: Field = emptyActions()
  ): Field {
    const actionDataHash = hashWithPrefix(MINA_EVENT_PREFIXES.event, action);
    return hashWithPrefix(MINA_EVENT_PREFIXES.sequenceEvents, [
      previousHash,
      actionDataHash,
    ]);
  }
}

export class MinaEvents {
  static eventHash(event: Field[], previousHash: Field = emptyEvents()): Field {
    const actionDataHash = hashWithPrefix(MINA_EVENT_PREFIXES.event, event);
    return hashWithPrefix(MINA_EVENT_PREFIXES.events, [
      previousHash,
      actionDataHash,
    ]);
  }
}

export class MinaPrefixedProvableHashList<
  Value,
> extends ProvableHashList<Value> {
  public constructor(
    valueType: ProvablePure<Value>,
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

export class MinaActionsHashList extends MinaPrefixedProvableHashList<Field> {
  public constructor(internalCommitment: Field = Field(0)) {
    super(Field, MINA_EVENT_PREFIXES.sequenceEvents, internalCommitment);
  }
}
