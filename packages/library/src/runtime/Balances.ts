import { EventsRecord, NoConfig } from "@proto-kit/common";
import {
  RuntimeModule,
  runtimeMethod,
  state,
  runtimeModule,
} from "@proto-kit/module";
import { StateMap, assert } from "@proto-kit/protocol";
import { Field, PublicKey, Struct } from "o1js";

import { UInt64 } from "../math/UInt64";

export const errors = {
  senderNotFrom: () => "Sender does not match 'from'",
  fromBalanceInsufficient: () => "From balance is insufficient",
};

export class TokenId extends Field {}
export class BalancesKey extends Struct({
  tokenId: TokenId,
  address: PublicKey,
}) {
  public static from(tokenId: TokenId, address: PublicKey) {
    return new BalancesKey({ tokenId, address });
  }
}

export class Balance extends UInt64 {}

export interface BalancesEvents extends EventsRecord {
  setBalance: [BalancesKey, Balance];
}

export type MinimalBalances = {
  balances: StateMap<BalancesKey, Balance>;
  transfer: (
    tokenId: TokenId,
    from: PublicKey,
    to: PublicKey,
    amount: Balance
  ) => void;
};

@runtimeModule()
export class Balances<Config = NoConfig>
  extends RuntimeModule<Config>
  implements MinimalBalances
{
  @state() public balances = StateMap.from<BalancesKey, Balance>(
    BalancesKey,
    Balance
  );

  public getBalance(tokenId: TokenId, address: PublicKey): Balance {
    const key = new BalancesKey({ tokenId, address });
    const balanceOption = this.balances.get(key);
    return Balance.Unsafe.fromField(balanceOption.value.value);
  }

  public setBalance(tokenId: TokenId, address: PublicKey, amount: Balance) {
    const key = new BalancesKey({ tokenId, address });
    this.balances.set(key, amount);
  }

  public transfer(
    tokenId: TokenId,
    from: PublicKey,
    to: PublicKey,
    amount: Balance
  ) {
    const fromBalance = this.getBalance(tokenId, from);
    const toBalance = this.getBalance(tokenId, to);

    const fromBalanceIsSufficient = fromBalance.greaterThanOrEqual(amount);

    assert(fromBalanceIsSufficient, errors.fromBalanceInsufficient());

    const newFromBalance = fromBalance.sub(amount);
    const newToBalance = toBalance.add(amount);

    this.setBalance(tokenId, from, newFromBalance);
    this.setBalance(tokenId, to, newToBalance);
  }

  public mint(tokenId: TokenId, address: PublicKey, amount: Balance) {
    const balance = this.getBalance(tokenId, address);
    const newBalance = balance.add(amount);
    this.setBalance(tokenId, address, newBalance);
  }

  public burn(tokenId: TokenId, address: PublicKey, amount: Balance) {
    const balance = this.getBalance(tokenId, address);
    const newBalance = balance.sub(amount);
    this.setBalance(tokenId, address, newBalance);
  }

  @runtimeMethod()
  public async transferSigned(
    tokenId: TokenId,
    from: PublicKey,
    to: PublicKey,
    amount: Balance
  ) {
    assert(this.transaction.sender.value.equals(from), errors.senderNotFrom());

    this.transfer(tokenId, from, to, amount);
  }
}
