import type { PendingTransaction } from "./PendingTransaction.js";
import type { Field } from "snarkyjs";

export type MempoolCommitment = { txListCommitment: Field }

export interface Mempool {

  /**
   * Add a transaction to the mempool
   * @returns The new commitment to the mempool
   */
  add: (tx: PendingTransaction) => MempoolCommitment;

  /**
   * Retrieve all transactions that are currently in the mempool
   */
  getTxs: () => { txs: PendingTransaction[], commitment: MempoolCommitment };

  // TODO Add stuff for witness generation

  // TODO Graphql

}
