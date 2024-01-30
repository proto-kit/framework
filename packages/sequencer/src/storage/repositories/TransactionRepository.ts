import { PendingTransaction } from "../../mempool/PendingTransaction";

export interface TransactionRepository {
  findTransaction: (hash: string) => Promise<
    | {
        transaction: PendingTransaction;
        block?: string;
        batch?: number;
      }
    | undefined
  >;
}
