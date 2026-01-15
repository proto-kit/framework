import { PendingTransactionJSONType } from "../../mempool/PendingTransaction";

export interface TransactionStorage {
  pushUserTransaction: (tx: PendingTransactionJSONType) => Promise<boolean>;

  getPendingUserTransactions: () => Promise<PendingTransactionJSONType[]>;

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
        transaction: PendingTransactionJSONType;
        block?: string;
        batch?: number;
      }
    | undefined
  >;
}
