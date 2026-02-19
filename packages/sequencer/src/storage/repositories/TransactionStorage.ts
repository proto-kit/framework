import { PendingTransaction } from "../../mempool/PendingTransaction";

export interface TransactionStorage {
  pushUserTransaction: (
    tx: PendingTransaction,
    priority: number
  ) => Promise<boolean>;

  getPendingUserTransactions: (
    offset: number,
    limit?: number
  ) => Promise<PendingTransaction[]>;

  countPendingUserTransactions: () => Promise<number>;

  removeTx: (txHashes: string[], type: "included" | "dropped") => Promise<void>;

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

  /**
   * Mapping hash => path[]
   */
  reportSkippedTransactions: (paths: Record<string, bigint[]>) => Promise<void>;

  reportChangedPaths: (paths: bigint[]) => Promise<void>;

  // TODO Add a method to retrieve all conflict transactions and expose it through the APIs
}
