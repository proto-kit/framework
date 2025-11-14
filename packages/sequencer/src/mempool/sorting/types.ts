import { PendingTransaction } from "../PendingTransaction";

export interface TransactionGroup {
  sender: string;
  transactions: TransactionQueueItem[];
}

export type SortingStrategy = (
  groups: TransactionGroup[]
) => TransactionQueueItem[];

export interface MempoolSortingConfig {
  sortingStrategy: SortingStrategy;
  maxTransactionsPerSender?: number;
  minGasFee?: bigint;
}

export interface TransactionQueueItem {
  transaction: PendingTransaction;
  order: number;
}
