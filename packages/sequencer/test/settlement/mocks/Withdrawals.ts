import {
  outgoingMessage,
  OutgoingMessages,
  runtimeMethod,
  runtimeModule,
  RuntimeModule,
} from "@proto-kit/module";
import {
  MessageProcessorArgs,
  outgoingMessageProcessor,
  OutgoingMessageProcessor,
  Withdrawal,
} from "@proto-kit/protocol";
import { AccountUpdate, Field, PublicKey, TokenId, UInt64 } from "o1js";
import { inject } from "tsyringe";
import { prefixToField } from "@proto-kit/common";

import { Balances } from "./Balances";

@runtimeModule()
export class Withdrawals extends RuntimeModule {
  @outgoingMessage()
  public messages = new OutgoingMessages({
    withdrawal: Withdrawal,
  });

  public constructor(@inject("Balances") private readonly balances: Balances) {
    super();
  }

  @runtimeMethod()
  public async withdraw(address: PublicKey, amount: UInt64, tokenId: Field) {
    const balance = await this.balances.getBalance(tokenId, address);

    const accountCreationFee = UInt64.Unsafe.fromField(Field(1n).mul(1e9));
    amount.assertGreaterThanOrEqual(
      accountCreationFee,
      "Minimum withdrawal amount not met"
    );
    balance.assertGreaterThanOrEqual(amount, "Not enough balance");

    // Deduct balance from user
    await this.balances.setBalance(tokenId, address, balance.sub(amount));

    // Add withdrawal to queue
    await this.messages.emitMessage(
      "withdrawal",
      new Withdrawal({
        address,
        // Has to be o1js UInt since the withdrawal will be processed in a o1js SmartContract
        amount: amount,
        tokenId: tokenId,
      }),
      tokenId
    );
  }
}

@outgoingMessageProcessor()
export class WithdrawalMessageProcessor extends OutgoingMessageProcessor<Withdrawal> {
  type = Withdrawal;

  // TODO Nicer and less error-prone API (for example enforcing embedding
  //  the type into the value struct
  messageType = prefixToField("withdrawal");

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
