import type { Field } from "snarkyjs";

import type { PendingTransaction } from "./PendingTransaction.js";

export interface MempoolCommitment {
  transactionsHash: Field;
}

export interface Mempool {

  /**
   * Add a transaction to the mempool
   * @returns The new commitment to the mempool
   */
  add: (tx: PendingTransaction) => MempoolCommitment;

  /**
   * Retrieve all transactions that are currently in the mempool
   */
  getTxs: () => { txs: PendingTransaction[]; commitment: MempoolCommitment };

  // Add stuff for witness generation
}
