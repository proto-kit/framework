import { EventEmitter, log, noop } from "@proto-kit/common";
import { inject } from "tsyringe";

import type { Mempool, MempoolEvents } from "../Mempool";
import type { PendingTransaction } from "../PendingTransaction";
import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { TransactionStorage } from "../../storage/repositories/TransactionStorage";
import { TransactionValidator } from "../verification/TransactionValidator";
import { Tracer } from "../../logging/Tracer";
import { trace } from "../../logging/trace";
import { IncomingMessagesService } from "../../settlement/messages/IncomingMessagesService";
import { MempoolSorting } from "../sorting/MempoolSorting";
import { DefaultMempoolSorting } from "../sorting/DefaultMempoolSorting";

type PrivateMempoolConfig = {
  type?: "hybrid" | "private" | "based";
};

@sequencerModule()
export class PrivateMempool
  extends SequencerModule<PrivateMempoolConfig>
  implements Mempool
{
  public readonly events = new EventEmitter<MempoolEvents>();

  private readonly mempoolSorting: MempoolSorting;

  public constructor(
    private readonly transactionValidator: TransactionValidator,
    @inject("TransactionStorage")
    private readonly transactionStorage: TransactionStorage,
    @inject("IncomingMessagesService", { isOptional: true })
    private readonly messageService: IncomingMessagesService | undefined,
    @inject("Tracer") public readonly tracer: Tracer,
    @inject("MempoolSorting", { isOptional: true })
    mempoolSorting: MempoolSorting | undefined
  ) {
    super();
    this.mempoolSorting = mempoolSorting ?? new DefaultMempoolSorting();
  }

  private type() {
    return this.config.type ?? "hybrid";
  }

  public async length(): Promise<number> {
    const txs = await this.transactionStorage.getPendingUserTransactions(0);
    return txs.length;
  }

  public async add(tx: PendingTransaction): Promise<boolean> {
    const [txValid, error] = this.transactionValidator.validateTx(tx);
    if (txValid) {
      const sortingValue = this.mempoolSorting!.presortingPriority(tx);

      const success = await this.transactionStorage.pushUserTransaction(
        tx,
        sortingValue
      );
      if (success) {
        this.events.emit("mempool-transaction-added", tx);
        log.trace(`Transaction added to mempool: ${tx.hash().toString()}`);
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

  public async removeTxs(included: string[], dropped: string[]) {
    await this.transactionStorage.removeTx(included, "included");
    await this.transactionStorage.removeTx(dropped, "dropped");
  }

  @trace("mempool.get_txs")
  public async getTxs(
    offset?: number,
    limit?: number
  ): Promise<PendingTransaction[]> {
    if (this.type() === "based") {
      return [];
    }

    let txs = await this.transactionStorage.getPendingUserTransactions(
      offset ?? 0,
      limit
    );

    if (this.mempoolSorting.enablePostSorting()) {
      txs = this.mempoolSorting.postSorting(txs);
    }

    return txs;
  }

  @trace("mempool.get_mandatory_txs")
  public async getMandatoryTxs(): Promise<PendingTransaction[]> {
    if (this.type() === "private") {
      return [];
    }
    return (await this.messageService?.getPendingMessages()) ?? [];
  }

  public async start(): Promise<void> {
    noop();
  }
}
