import { EventEmitter, log, noop } from "@proto-kit/common";
import { inject } from "tsyringe";
import {
  AccountStateHook,
  MandatoryProtocolModulesRecord,
  Protocol,
  ProvableTransactionHook,
} from "@proto-kit/protocol";

import type { Mempool, MempoolEvents } from "../Mempool";
import type { PendingTransaction } from "../PendingTransaction";
import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { TransactionStorage } from "../../storage/repositories/TransactionStorage";
import { TransactionValidator } from "../verification/TransactionValidator";

@sequencerModule()
export class PrivateMempool extends SequencerModule implements Mempool {
  public readonly events = new EventEmitter<MempoolEvents>();

  private readonly accountStateHook: AccountStateHook;

  public constructor(
    private readonly transactionValidator: TransactionValidator,
    @inject("TransactionStorage")
    private readonly transactionStorage: TransactionStorage,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>
  ) {
    super();
    this.accountStateHook =
      this.protocol.dependencyContainer.resolve("AccountStateHook");
  }

  public async add(tx: PendingTransaction): Promise<boolean> {
    const [txValid, error] = this.transactionValidator.validateTx(tx);
    if (txValid) {
      const success = await this.transactionStorage.pushUserTransaction(tx);
      if (success) {
        this.events.emit("mempool-transaction-added", tx);
        log.info(
          `Transaction added to mempool: ${tx.hash().toString()} (${(await this.getTxs()).length} transactions in mempool)`
        );
      } else {
        log.error(
          `Transaction ${tx.hash().toString()} rejected: already exists in mempool`
        );
      }

      return success;
    }

    log.error(
      `Validation of tx ${tx.hash().toString()} failed:`,
      `${error ?? "unknown error"}`
    );

    throw new Error(
      `Validation of tx ${tx.hash().toString()} failed: ${error ?? "unknown error"}`
    );
  }

  public async getTxs(): Promise<PendingTransaction[]> {
    const txs = await this.transactionStorage.getPendingUserTransactions();
    const sortedTxs: PendingTransaction[] = [];
    for (const tx of txs) {
      const signedTransaction = tx.toProtocolTransaction();
      const txWithHooks = this.accountStateHook.onTransaction({
        networkState: this.protocol.n,
        transaction: signedTransaction.transaction,
        signature: signedTransaction.signature,
      });
      sortedTxs.push(tx);
    }
    return sortedTxs;
  }

  public async start(): Promise<void> {
    noop();
  }
}
