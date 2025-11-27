import {
  outgoingMessage,
  OutgoingMessages,
  runtimeModule,
  RuntimeModule,
} from "@proto-kit/module";
import { assert } from "@proto-kit/protocol";
import { Field, PublicKey, Struct, UInt64 as O1UInt64 } from "o1js";
import { inject } from "tsyringe";
import { EMPTY_PUBLICKEY } from "@proto-kit/common";

import { UInt64 } from "../math/UInt64";

import { Balances } from "./Balances";

export class Withdrawal extends Struct({
  tokenId: Field,
  address: PublicKey,
  amount: O1UInt64,
}) {
  public static dummy() {
    return new Withdrawal({
      tokenId: Field(0),
      address: EMPTY_PUBLICKEY,
      amount: O1UInt64.from(0),
    });
  }
}

@runtimeModule()
export class Withdrawals extends RuntimeModule {
  @outgoingMessage()
  messages = new OutgoingMessages({
    withdrawal: Withdrawal,
  });

  public constructor(@inject("Balances") private readonly balances: Balances) {
    super();
  }

  public async withdraw(address: PublicKey, amount: UInt64, tokenId: Field) {
    const balance = await this.balances.getBalance(tokenId, address);

    const accountCreationFee = UInt64.Unsafe.fromField(Field(1n).mul(1e9));
    assert(
      amount.greaterThanOrEqual(accountCreationFee),
      "Minimum withdrawal amount not met"
    );
    assert(balance.greaterThanOrEqual(amount), "Not enough balance");

    // Deduct balance from user
    await this.balances.setBalance(tokenId, address, balance.sub(amount));

    // Add withdrawal to queue
    const withdrawal = new Withdrawal({
      address,
      // Has to be o1js UInt since the withdrawal will be processed in a o1js SmartContract
      amount: amount.toO1UInt64(),
      tokenId: tokenId,
    });

    await this.messages.emitMessage("withdrawal", withdrawal);
  }
}
