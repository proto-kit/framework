import {
  runtimeMethod,
  runtimeModule,
  RuntimeModule,
  state,
} from "@proto-kit/module";
import { assert, State, StateMap, Withdrawal } from "@proto-kit/protocol";
import { Bool, Field, Mina, PublicKey, UInt64 } from "o1js";
import { inject } from "tsyringe";

import { Balance } from "./Balance";
import { UInt64 as U1 } from "@proto-kit/library";

@runtimeModule()
export class Withdrawals extends RuntimeModule {
  @state() withdrawalCounter = State.from(Field);

  @state() withdrawals = StateMap.from<Field, Withdrawal>(Field, Withdrawal);

  public constructor(@inject("Balances") private readonly balances: Balance) {
    super();
  }

  protected queueWithdrawal(withdrawal: Withdrawal) {
    const counter = this.withdrawalCounter.get().orElse(Field(0));

    this.withdrawals.set(counter, withdrawal);

    this.withdrawalCounter.set(counter.add(1));
  }

  @runtimeMethod()
  public withdraw(address: PublicKey, amount: UInt64) {
    const balance = this.balances.getBalance(address);

    assert(
      amount.greaterThanOrEqual(Mina.accountCreationFee().toConstant()),
      "Minimum withdrawal amount not met"
    );
    assert(
      balance.value.value.greaterThanOrEqual(amount.value),
      "Not enough balance"
    );

    // this.balances.setBalanceIf(address, UInt64.from(balance.value.value).sub(amount), Bool(true));

    this.queueWithdrawal(
      new Withdrawal({
        address,
        amount,
      })
    );
  }
}
