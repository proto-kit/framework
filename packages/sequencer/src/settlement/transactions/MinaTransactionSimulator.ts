import {
  AccountUpdate,
  addCachedAccount,
  Bool,
  fetchAccount,
  Field,
  Mina,
  PublicKey,
  TokenId,
  Types,
  UInt32,
  Transaction,
} from "o1js";
import { ReturnType } from "@proto-kit/protocol";
import { match } from "ts-pattern";
import { inject, injectable } from "tsyringe";
import { noop } from "@proto-kit/common";

import { distinctByPredicate } from "../../helpers/utils";
import type { MinaBaseLayer } from "../../protocol/baselayer/MinaBaseLayer";

type Account = ReturnType<typeof Mina.getAccount>;

type FeePayer = Transaction<false, false>["transaction"]["feePayer"];

@injectable()
export class MinaTransactionSimulator {
  private local = this.baseLayer.config.network.local;

  private loaded: Record<string, Account | null> = {};

  public constructor(
    @inject("BaseLayer") private readonly baseLayer: MinaBaseLayer
  ) {}

  private async fetchGraphql<Type>(
    f: () => Promise<Type>
  ): Promise<Type | undefined> {
    if (!this.baseLayer.config.network.local) {
      return await f();
    }
    return undefined;
  }

  private async getAccountsInternal(
    tx: Transaction<boolean, boolean>
  ): Promise<Record<string, Account>> {
    const { feePayer, accountUpdates } = tx.transaction;

    const accounts: Record<string, Account> = {};

    const accountsKeys = [[feePayer.body.publicKey, TokenId.default] as const]
      .concat(accountUpdates.map((au) => [au.publicKey, au.tokenId]))
      .filter(
        distinctByPredicate((a, b) =>
          a[0].equals(b[0]).and(a[1].equals(b[1])).toBoolean()
        )
      );

    for (const [pubKey, tokenId] of accountsKeys) {
      // eslint-disable-next-line no-await-in-loop
      accounts[this.cacheKey(pubKey, tokenId)] = await this.getAccount(
        pubKey,
        tokenId
      );
    }

    return accounts;
  }

  public async getAccounts(
    tx: Transaction<boolean, boolean>
  ): Promise<Account[]> {
    return Object.values(await this.getAccountsInternal(tx));
  }

  public async applyTransaction(tx: Transaction<boolean, boolean>) {
    const { feePayer, accountUpdates } = tx.transaction;

    const accounts = await this.getAccountsInternal(tx);

    const feePayerAccount = accounts[this.cacheKey(feePayer.body.publicKey)];

    if (!this.checkFeePayer(feePayerAccount, feePayer)) {
      throw new Error("Feepayer invalid");
    }
    this.applyFeepayer(feePayerAccount, feePayer);

    // This check isn't 100% accurate, since the preconditions should probably
    // be checked after previous AUs have been already applied.
    // But it should be enough for now
    const valid = accountUpdates
      .map((au) =>
        this.checkPreconditions(
          accounts[this.cacheKey(au.publicKey, au.tokenId)],
          au
        )
      )
      .reduce((a, b) => a && b);
    if (!valid) {
      throw new Error("AccountUpdate preconditions not satisfied");
    }

    accountUpdates.forEach((au) => {
      this.apply(accounts[this.cacheKey(au.publicKey, au.tokenId)], au);
    });

    Object.entries(accounts).forEach(([, account]) => {
      addCachedAccount(account);
      this.loaded[account.publicKey.toBase58()] = account;
    });
  }

  private cacheKey(publicKey: PublicKey, tokenId?: Field): string {
    return (
      publicKey.toBase58() +
      (tokenId && tokenId.equals(TokenId.default).not().toBoolean()
        ? `-${tokenId.toString()}`
        : "")
    );
  }

  public async getAccount(publicKey: PublicKey, tokenId?: Field) {
    const key = this.cacheKey(publicKey, tokenId);
    if (this.loaded[key] === undefined) {
      await this.reloadAccount(publicKey, tokenId);
    }
    return this.loaded[key] ?? this.dummyAccount(publicKey);
  }

  private dummyAccount(pubkey?: PublicKey, tokenId?: Field): Account {
    const dummy = Types.Account.empty();
    if (pubkey) {
      dummy.publicKey = pubkey;
    }
    if (tokenId) {
      dummy.tokenId = tokenId;
    }
    return dummy;
  }

  // TODO Add applying of pending transaction fetched from mempool or DB

  public async reloadAccount(publicKey: PublicKey, tokenId?: Field) {
    const key = this.cacheKey(publicKey, tokenId);
    if (!this.local) {
      const fetchedAccount = await this.fetchGraphql(() =>
        fetchAccount({ publicKey, tokenId })
      );
      const getAccountSafe = () => {
        try {
          return Mina.getAccount(publicKey, tokenId);
        } catch {
          return undefined;
        }
      };
      const account = match(fetchedAccount)
        .with(undefined, () => getAccountSafe())
        .with({ account: undefined }, () => getAccountSafe())
        .with({ error: undefined }, (v) => v.account)
        .exhaustive();

      if (account !== undefined) {
        addCachedAccount(account);
        this.loaded[key] = account;
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const instance = Mina.activeInstance as Awaited<
        ReturnType<typeof Mina.LocalBlockchain>
      >;
      try {
        this.loaded[key] = instance.getAccount(publicKey, tokenId);
      } catch {
        noop();
      }
    }
  }

  public checkFeePayer(account: Account, feepayer: FeePayer): boolean {
    return account.balance
      .greaterThanOrEqual(feepayer.body.fee)
      .and(account.nonce.equals(feepayer.body.nonce))
      .toBoolean();
  }

  public checkPreconditions(account: Account, au: AccountUpdate): boolean {
    let valid = true;

    const { balance, nonce, state } = au.body.preconditions.account;

    if (balance.isSome.toBoolean()) {
      valid &&= account.balance
        .greaterThanOrEqual(balance.value.lower)
        .and(account.balance.lessThanOrEqual(balance.value.upper))
        .toBoolean();
    }

    if (nonce.isSome.toBoolean()) {
      valid &&= account.nonce
        .greaterThanOrEqual(nonce.value.lower)
        .and(account.nonce.lessThanOrEqual(nonce.value.upper))
        .toBoolean();
    }

    for (let i = 0; i < 8; i++) {
      if (state[i].isSome.toBoolean()) {
        valid &&= account.zkapp!.appState[i].equals(state[i].value).toBoolean();
      }
    }

    return valid;
  }

  public applyFeepayer(account: Account, feepayer: FeePayer) {
    account.balance = account.balance.sub(feepayer.body.fee);
    account.nonce = account.nonce.add(1);
  }

  public apply(account: Account, au: AccountUpdate) {
    const { balanceChange, update, incrementNonce } = au.body;

    try {
      account.balance = balanceChange.sgn.isPositive().toBoolean()
        ? account.balance.add(balanceChange.magnitude)
        : account.balance.sub(balanceChange.magnitude);
    } catch (e) {
      throw new Error(
        `Account balance: ${account.balance.toString()}, balance change: ${balanceChange.sgn.isPositive().toBoolean() ? "+" : "-"}${balanceChange.magnitude.toString()}`
      );
    }

    if (incrementNonce.toBoolean()) {
      account.nonce = account.nonce.add(1);
    }

    if (update.verificationKey.isSome.toBoolean()) {
      (account.zkapp ??= {
        appState: Array(8)
          .fill(0)
          .map(() => Field(0)),
        verificationKey: undefined,
        actionState: Array(5)
          .fill(0)
          .map(() => Field(0)),
        zkappUri: "",
        provedState: Bool(false),
        zkappVersion: UInt32.zero,
        lastActionSlot: UInt32.zero,
      }).verificationKey = update.verificationKey.value;
    }

    if (account.zkapp !== undefined) {
      const { appState } = update;
      for (let i = 0; i < 8; i++) {
        if (appState[i].isSome.toBoolean()) {
          account.zkapp.appState[i] = appState[i].value;
        }
      }
    }
  }
}
