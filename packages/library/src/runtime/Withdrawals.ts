import { runtimeModule, RuntimeModule, state } from "@proto-kit/module";
import { State, StateMap, Withdrawal } from "@proto-kit/protocol";
import { Field, PublicKey, Struct } from "o1js";
import { inject } from "tsyringe";

import { UInt64 } from "../math/UInt64";

import { Balances, TokenId } from "./Balances";

export class WithdrawalKey extends Struct({
  index: Field,
  tokenId: Field,
}) {}

@runtimeModule()
export class Withdrawals extends RuntimeModule {
  @state() withdrawalCounters = StateMap.from(Field, Field);

  @state() withdrawals = StateMap.from<WithdrawalKey, Withdrawal>(
    WithdrawalKey,
    Withdrawal
  );

  public constructor(@inject("Balances") private readonly balances: Balances) {
    super();
  }

  protected async queueWithdrawal(withdrawal: Withdrawal) {
    const { tokenId } = withdrawal;
    const counter = (await this.withdrawalCounters.get(tokenId)).orElse(
      Field(0)
    );

    await this.withdrawals.set({ index: counter, tokenId }, withdrawal);

    await this.withdrawalCounters.set(tokenId, counter.add(1));
  }

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
    await this.queueWithdrawal(
      new Withdrawal({
        address,
        // Has to be o1js UInt since the withdrawal will be processed in a o1js SmartContract
        amount: amount.toO1UInt64(),
        tokenId: tokenId,
      })
    );
  }
}
