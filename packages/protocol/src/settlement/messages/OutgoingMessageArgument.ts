import {
  Bool,
  Field,
  FlexibleProvablePure,
  Provable,
  Struct,
  Unconstrained,
} from "o1js";
import {
  LinkedMerkleTree,
  LinkedMerkleTreeReadWitness,
} from "@proto-kit/common";

import { OutgoingMessage } from "./OutgoingMessage";

// TODO Make that dynamic based on processors configured
export const OUTGOING_MESSAGE_BATCH_SIZE = 1;

export function createMessageStruct<T>(type: FlexibleProvablePure<T>) {
  return class MessageStruct extends Struct({
    value: type,
    messageType: Field,
  }) {} satisfies FlexibleProvablePure<OutgoingMessage<T>>;
}

export class OutgoingMessageArgument extends Struct({
  witness: LinkedMerkleTreeReadWitness,
  messageType: Field,
  data: Unconstrained<Field[]>,
}) {
  public static dummy(): OutgoingMessageArgument {
    return new OutgoingMessageArgument({
      witness: LinkedMerkleTree.dummyReadWitness(),
      messageType: Field(0),
      data: Unconstrained.from([]),
    });
  }
}

export class OutgoingMessageArgumentBatch extends Struct({
  arguments: Provable.Array(
    OutgoingMessageArgument,
    OUTGOING_MESSAGE_BATCH_SIZE
  ),

  isDummys: Provable.Array(Bool, OUTGOING_MESSAGE_BATCH_SIZE),
}) {
  public static fromMessages(providedArguments: OutgoingMessageArgument[]) {
    const batch = providedArguments.slice();
    const isDummys = batch.map(() => Bool(false));

    while (batch.length < OUTGOING_MESSAGE_BATCH_SIZE) {
      batch.push(OutgoingMessageArgument.dummy());
      isDummys.push(Bool(true));
    }

    return new OutgoingMessageArgumentBatch({
      arguments: batch,
      isDummys,
    });
  }
}
