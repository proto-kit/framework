import { PendingTransaction } from "../../mempool/PendingTransaction";

export interface TransactionStorage {
  pushUserTransaction: (tx: PendingTransaction) => Promise<boolean>;

  getPendingUserTransactions: () => Promise<PendingTransaction[]>;

  /**
   * Finds a transaction by its hash.
   * It returns both pending transaction and already included transactions
   * In case the transaction has been included, it also returns the block hash
   * and batch number where applicable.
   * @param hash
   */
  findTransaction: (hash: string) => Promise<
    | {
        transaction: PendingTransaction;
        block?: string;
        batch?: number;
      }
    | undefined
  >;
}
