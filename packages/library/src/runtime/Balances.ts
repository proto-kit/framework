/* eslint-disable import/no-unused-modules */
/* eslint-disable max-classes-per-file */
import {
  EventEmitter,
  EventEmittingComponent,
  EventsRecord,
} from "@proto-kit/common";
import {
  RuntimeModule,
  runtimeMethod,
  state,
  runtimeModule,
} from "@proto-kit/module";
import { StateMap, assert } from "@proto-kit/protocol";
import { Field, Provable, PublicKey, Struct, UInt64 } from "o1js";

export const errors = {
  senderNotFrom: () => "Sender does not match 'from'",
  fromBalanceInsufficient: () => "From balance is insufficient",
};

export class TokenId extends Field {}
export class BalancesKey extends Struct({
  tokenId: TokenId,
  address: PublicKey,
}) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public test() {}
}

export class Balance extends UInt64 {}

export interface BalancesEvents extends EventsRecord {
  setBalance: [BalancesKey, Balance];
}

@runtimeModule()
export class Balances
  extends RuntimeModule<unknown>
  implements EventEmittingComponent<BalancesEvents>
{
  @state() public balances = StateMap.from<BalancesKey, Balance>(
    BalancesKey,
    Balance
  );

  public events = new EventEmitter<BalancesEvents>();

  public getBalance(tokenId: TokenId, address: PublicKey): Balance {
    const key = new BalancesKey({ tokenId, address });
    const balanceOption = this.balances.get(key);

    return Provable.if<Balance>(
      balanceOption.isSome,
      Balance,
      balanceOption.value,
      Balance.from(0)
    );
  }

  public setBalance(tokenId: TokenId, address: PublicKey, amount: Balance) {
    const key = new BalancesKey({ tokenId, address });
    this.events.emit("setBalance", key, amount);
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

    // used to prevent field underflow during subtraction
    const paddedFrombalance = fromBalance.add(amount);
    const safeFromBalance = Provable.if<Balance>(
      fromBalanceIsSufficient,
      Balance,
      fromBalance,
      paddedFrombalance
    );

    const newFromBalance = safeFromBalance.sub(amount);
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
    // replace with library/uint64
    const paddedBalance = Provable.if<Balance>(
      balance.greaterThanOrEqual(amount),
      Balance,
      balance,
      balance.add(amount)
    );
    const newBalance = paddedBalance.sub(amount);
    this.setBalance(tokenId, address, newBalance);
  }

  @runtimeMethod()
  public transferSigned(
    tokenId: TokenId,
    from: PublicKey,
    to: PublicKey,
    amount: Balance
  ) {
    assert(this.transaction.sender.equals(from), errors.senderNotFrom());

    this.transfer(tokenId, from, to, amount);
  }
}
