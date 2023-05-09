import type { PendingTransaction } from "./PendingTransaction.js";
import type { Field } from "snarkyjs";

export type MempoolCommitment = { txListCommitment: Field }

export interface Mempool {

  add: (tx: PendingTransaction) => MempoolCommitment;

  getTxs: () => { txs: PendingTransaction[], commitment: MempoolCommitment };

  // TODO Add stuff for witness generation

  // TODO Graphql

}
