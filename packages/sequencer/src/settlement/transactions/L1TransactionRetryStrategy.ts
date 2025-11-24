import {
  PendingL1TransactionRecord,
} from "../../storage/repositories/PendingL1TransactionStorage";
import { Transaction } from "o1js";

export interface L1TransactionRetryStrategy {
  shouldRetry(
    record: PendingL1TransactionRecord
  ): Promise<boolean>;
  
  prepareRetryTransaction(
    record: PendingL1TransactionRecord,
  ): Promise<Transaction<any, false>>;
}

