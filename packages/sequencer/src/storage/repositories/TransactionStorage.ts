import { PendingTransaction } from "../../mempool/PendingTransaction";

export interface TransactionStorage {
  pushUserTransaction: (tx: PendingTransaction) => Promise<boolean>;
  getPendingUserTransactions: () => Promise<PendingTransaction[]>;
}
