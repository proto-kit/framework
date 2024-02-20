 import { AccountUpdate, Mina } from "o1js";
import { ReturnType } from "@proto-kit/protocol";

type Account = ReturnType<typeof Mina.getAccount>;

// TODO Merge MinaSimulationService into it

export class TransactionSimulator {
  public checkPreconditions(account: Account, au: AccountUpdate): boolean {
    let valid = true;

    const { balance, nonce, isNew } = au.body.preconditions.account;

    if (balance.isSome.toBoolean()) {
      valid &&= account.balance
        .greaterThanOrEqual(balance.value.lower)
        .and(account.balance.lessThanOrEqual(balance.value.upper))
        .toBoolean();
    }

    if(nonce.isSome.toBoolean()) {
      valid &&= account.nonce
        .greaterThanOrEqual(nonce.value.lower)
        .and(account.nonce.lessThanOrEqual(nonce.value.upper))
        .toBoolean();
    }

    return valid;
  }

  public apply(account: Account, au: AccountUpdate) {
    const { balanceChange, update, incrementNonce } = au.body;

    account.balance = balanceChange.sgn.isPositive()
      ? account.balance.add(balanceChange.magnitude)
      : account.balance.sub(balanceChange.magnitude);

    if (incrementNonce.toBoolean()) {
      account.nonce = account.nonce.add(1);
    }

    if (account.zkapp !== undefined) {
      const appState = update.appState;
      for (let i = 0; i < 8; i++) {
        if (appState[i].isSome.toBoolean()) {
          account.zkapp.appState[i] = appState[i].value;
        }
      }
    }
  }
}
