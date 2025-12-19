import { Transaction } from "o1js";

import { PendingL1TransactionRecord } from "../../storage/repositories/PendingL1TransactionStorage";

export interface L1TransactionRetryStrategy {
  shouldRetry(record: PendingL1TransactionRecord): Promise<boolean>;

  prepareRetryTransaction(
    record: PendingL1TransactionRecord
  ): Promise<Transaction<any, false>>;
}
