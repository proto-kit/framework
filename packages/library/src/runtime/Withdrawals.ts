import { runtimeModule, RuntimeModule, state } from "@proto-kit/module";
import { State, StateMap, Withdrawal } from "@proto-kit/protocol";
import { Field, PublicKey } from "o1js";
import { inject } from "tsyringe";

import { UInt64 } from "../math/UInt64";

import { Balances, TokenId } from "./Balances";

@runtimeModule()
export class Withdrawals extends RuntimeModule {
  @state() withdrawalCounter = State.from(Field);

  @state() withdrawals = StateMap.from<Field, Withdrawal>(Field, Withdrawal);

  public constructor(@inject("Balances") private readonly balances: Balances) {
    super();
  }

  protected async queueWithdrawal(withdrawal: Withdrawal) {
    const counter = (await this.withdrawalCounter.get()).orElse(Field(0));

    this.withdrawals.set(counter, withdrawal);

    this.withdrawalCounter.set(counter.add(1));
  }

  public async withdraw(address: PublicKey, amount: UInt64) {
    const balance = await this.balances.getBalance(TokenId.from(0), address);

    const accountCreationFee = UInt64.Unsafe.fromField(Field(1n).mul(1e9));
    amount.assertGreaterThanOrEqual(
      accountCreationFee,
      "Minimum withdrawal amount not met"
    );
    balance.assertGreaterThanOrEqual(amount, "Not enough balance");

    // Deduct balance from user
    this.balances.setBalance(TokenId.from(0), address, balance.sub(amount));

    // Add withdrawal to queue
    this.queueWithdrawal(
      new Withdrawal({
        address,
        // Has to be o1js UInt since the withdrawal will be processed in a o1js SmartContract
        amount: amount.toO1UInt64(),
      })
    );
  }
}
