import type { Field } from "o1js";
import { EventEmittingComponent, EventsRecord } from "@proto-kit/common";

import type { PendingTransaction } from "./PendingTransaction.js";

export interface MempoolCommitment {
  transactionsHash: Field;
}

export interface MempoolEvents extends EventsRecord {
  transactionAdded: [PendingTransaction, MempoolCommitment];
  transactionsRemoved: [PendingTransaction[]]
}

export interface Mempool extends EventEmittingComponent<MempoolEvents> {
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
  removeTxs: (txs: PendingTransaction[]) => boolean;
}
