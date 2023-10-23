import {
  RuntimeModule,
  runtimeModule,
  state,
  runtimeMethod,
} from "@proto-kit/module";
import { Provable, PublicKey, Struct, UInt64 } from "o1js";
import { State, StateMap, assert } from "@proto-kit/protocol";

interface BalancesConfig {
  totalSupply: UInt64;
}

class Test extends Struct({
  test: UInt64,
}) {}

@runtimeModule()
export class Balances extends RuntimeModule<BalancesConfig> {
  @state() public balances = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  @state() public test = State.from<Test>(Test);

  @state() public circulatingSupply = State.from<UInt64>(UInt64);

  @runtimeMethod()
  public setBalance(address: PublicKey, amount: UInt64) {
    const circulatingSupply = this.circulatingSupply.get();
    const newCirculatingSupply = circulatingSupply.value.add(amount);

    assert(
      newCirculatingSupply.lessThanOrEqual(this.config.totalSupply),
      "Circulating supply would be higher than total supply"
    );

    this.circulatingSupply.set(newCirculatingSupply);

    const currentBalance = this.balances.get(address);
    const newBalance = currentBalance.value.add(amount);

    this.balances.set(address, newBalance);
  }

  @runtimeMethod()
  public transfer(from: PublicKey, to: PublicKey, amount: UInt64) {
    const fromBalance = this.balances.get(from);
    const toBalance = this.balances.get(to);

    assert(
      fromBalance.value.greaterThanOrEqual(amount),
      "From balance is not sufficient"
    );

    const safeFromBalance = Provable.if(
      fromBalance.value.greaterThanOrEqual(amount),
      fromBalance.value,
      amount
    );

    const newFromBalance = safeFromBalance.sub(amount);
    const newToBalance = toBalance.value.add(amount);

    this.balances.set(from, newFromBalance);
    this.balances.set(to, newToBalance);
  }
}
