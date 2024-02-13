import type { Field } from "o1js";

import type { PendingTransaction } from "./PendingTransaction.js";

export interface MempoolCommitment {
  transactionsHash: Field;
}

export interface Mempool {
  /**
   * Add a transaction to the mempool
   * @returns The new commitment to the mempool
   */
  add: (tx: PendingTransaction) => Promise<boolean>;

  /**
   * Retrieve all transactions that are currently in the mempool
   */
  getTxs: () => Promise<PendingTransaction[]>;
}
