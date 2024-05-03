import { EventEmitter, noop } from "@proto-kit/common";
import { inject } from "tsyringe";

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

  public constructor(
    private readonly transactionValidator: TransactionValidator,
    @inject("TransactionStorage")
    private readonly transactionStorage: TransactionStorage
  ) {
    super();
  }

  public async add(tx: PendingTransaction): Promise<boolean> {
    const [txValid, error] = this.transactionValidator.validateTx(tx);
    if (txValid) {
      const success = await this.transactionStorage.pushUserTransaction(tx);
      if (success) {
        this.events.emit("mempool-transaction-added", tx);
      }
      return success;
    }
    throw new Error(`Validation of tx failed: ${error ?? "unknown error"}`);
  }

  public async remove(hash: string): Promise<boolean> {
    return await this.transactionStorage.removeUserTransaction(hash);
  }

  public async getTxs(): Promise<PendingTransaction[]> {
    return await this.transactionStorage.getPendingUserTransactions();
  }

  public async start(): Promise<void> {
    noop();
  }
}
