import { Bool, Provable, Struct } from "o1js";
import { RollupMerkleTreeWitness } from "@proto-kit/common";

import { Withdrawal } from "./Withdrawal";

export const OUTGOING_MESSAGE_BATCH_SIZE = 1;

export class OutgoingMessageArgument extends Struct({
  witness: RollupMerkleTreeWitness,
  value: Withdrawal,
}) {
  public static dummy(): OutgoingMessageArgument {
    return new OutgoingMessageArgument({
      witness: RollupMerkleTreeWitness.dummy(),
      value: Withdrawal.dummy(),
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
