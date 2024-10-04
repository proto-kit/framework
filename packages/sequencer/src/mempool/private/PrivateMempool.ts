import { EventEmitter, log, noop } from "@proto-kit/common";
import { inject } from "tsyringe";
import {
  AccountStateHook,
  MandatoryProtocolModulesRecord,
  NetworkState,
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
import { BlockQueue } from "../../storage/repositories/BlockStorage";
import {
  Sequencer,
  SequencerModulesRecord,
} from "../../sequencer/executor/Sequencer";

@sequencerModule()
export class PrivateMempool extends SequencerModule implements Mempool {
  public readonly events = new EventEmitter<MempoolEvents>();

  private readonly accountStateHook: AccountStateHook;

  public constructor(
    private readonly transactionValidator: TransactionValidator,
    @inject("TransactionStorage")
    private readonly transactionStorage: TransactionStorage,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    @inject("Sequencer")
    private readonly sequencer: Sequencer<SequencerModulesRecord>
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

  private get unprovenQueue(): BlockQueue {
    return this.sequencer.dependencyContainer.resolve<BlockQueue>("BlockQueue");
  }

  public async getStagedNetworkState(): Promise<NetworkState | undefined> {
    const result = await this.unprovenQueue.getLatestBlock();
    return result?.result.afterNetworkState;
  }

  public async getTxs(): Promise<PendingTransaction[]> {
    const txs = await this.transactionStorage.getPendingUserTransactions();
    const sortedTxs: PendingTransaction[] = [];
    for (const tx of txs) {
      const signedTransaction = tx.toProtocolTransaction();
      const txWithHooks = this.accountStateHook.onTransaction({
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, no-await-in-loop
        networkState: (await this.getStagedNetworkState()) as NetworkState,
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
