import { PendingTransaction } from "../../mempool/PendingTransaction";

export interface TransactionStorage {
  pushUserTransaction: (tx: PendingTransaction) => Promise<boolean>;

  removeUserTransaction: (hash: string) => Promise<boolean>;

  getPendingUserTransactions: () => Promise<PendingTransaction[]>;

  findTransaction: (hash: string) => Promise<
    | {
        transaction: PendingTransaction;
        block?: string;
        batch?: number;
      }
    | undefined
  >;
}
