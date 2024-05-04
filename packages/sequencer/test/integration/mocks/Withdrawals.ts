import {
  runtimeMethod,
  runtimeModule,
  RuntimeModule,
  state,
} from "@proto-kit/module";
import { assert, State, StateMap, Withdrawal } from "@proto-kit/protocol";
import { Field, Mina, PublicKey, UInt64 } from "o1js";
import { inject } from "tsyringe";

import { Balance } from "./Balance";

@runtimeModule()
export class Withdrawals extends RuntimeModule {
  @state() withdrawalCounter = State.from(Field);

  @state() withdrawals = StateMap.from<Field, Withdrawal>(Field, Withdrawal);

  public constructor(@inject("Balances") private readonly balances: Balance) {
    super();
  }

  protected queueWithdrawal(withdrawal: Withdrawal) {
    const counter = this.withdrawalCounter.get().orElse(Field(0));

    this.withdrawalCounter.set(counter.add(1));

    this.withdrawals.set(counter, withdrawal);
  }

  @runtimeMethod()
  public async withdraw(address: PublicKey, amount: UInt64) {
    const balance = await this.balances.getBalance(address);

    assert(
      amount.greaterThanOrEqual(
        Mina.getNetworkConstants().accountCreationFee.toConstant()
      ),
      "Minimum withdrawal amount not met"
    );
    assert(balance.value.greaterThanOrEqual(amount), "Not enough balance");

    // eslint-disable-next-line max-len
    // this.balances.setBalanceIf(address, UInt64.from(balance.value.value).sub(amount), Bool(true));

    this.queueWithdrawal(
      new Withdrawal({
        address,
        amount,
      })
    );
  }
}
