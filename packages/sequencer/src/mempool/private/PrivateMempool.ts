import { noop } from "@proto-kit/common";
import { inject } from "tsyringe";

import type { Mempool } from "../Mempool.js";
import type { PendingTransaction } from "../PendingTransaction.js";
import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { TransactionStorage } from "../../storage/repositories/TransactionStorage";
import { TransactionValidator } from "../verification/TransactionValidator";

@sequencerModule()
export class PrivateMempool extends SequencerModule implements Mempool {
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
      return await this.transactionStorage.pushUserTransaction(tx);
    }
    throw new Error(`Valdiation of tx failed: ${error ?? "unknown error"}`);
  }

  public async getTxs(): Promise<PendingTransaction[]> {
    return await this.transactionStorage.getPendingUserTransactions();
  }

  public async start(): Promise<void> {
    noop();
  }
}
