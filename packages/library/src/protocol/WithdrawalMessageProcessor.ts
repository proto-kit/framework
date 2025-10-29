import {
  MessageProcessorArgs,
  OutgoingMessageProcessor,
  outgoingMessageProcessor,
} from "@proto-kit/protocol";
import { AccountUpdate, TokenId } from "o1js";

import { Withdrawal } from "../runtime/Withdrawals";

@outgoingMessageProcessor()
export class WithdrawalMessageProcessor extends OutgoingMessageProcessor<Withdrawal> {
  type = Withdrawal;

  messageType = "withdrawal";

  dummy(): Withdrawal {
    return Withdrawal.dummy();
  }

  process(
    message: Withdrawal,
    { bridgeContract }: MessageProcessorArgs
  ): AccountUpdate[] {
    const subTokenId = TokenId.derive(
      bridgeContract.publicKey,
      bridgeContract.tokenId
    );
    const mintAccountUpdate = AccountUpdate.default(
      message.address,
      subTokenId
    );
    mintAccountUpdate.balance.addInPlace(message.amount);
    mintAccountUpdate.label = "Withdrawal processor: mint token";
    return [mintAccountUpdate];
  }
}
