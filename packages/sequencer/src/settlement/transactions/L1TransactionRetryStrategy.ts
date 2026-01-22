import { Transaction } from "o1js";

import { PendingL1TransactionRecord } from "../../storage/repositories/PendingL1TransactionStorage";

export interface L1TransactionRetryStrategy {
  shouldRetry(record: PendingL1TransactionRecord): Promise<boolean>;

  /**
   * Optional retry delay. If provided, the dispatcher will schedule
   * the next retry after the delay from the last sentAt time.
   */
  getRetryDelayMs?(record: PendingL1TransactionRecord): number;

  prepareRetryTransaction(
    record: PendingL1TransactionRecord
  ): Promise<Transaction<any, false>>;
}
