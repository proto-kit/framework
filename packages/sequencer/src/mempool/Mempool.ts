import {PendingTransaction} from "./PendingTransaction.js";
import {Field} from "snarkyjs";

export type MempoolCommitment = { txListCommitment: Field }

export interface Mempool {

    add(tx: PendingTransaction): MempoolCommitment

    getTxs(): { txs: PendingTransaction[], commitment: MempoolCommitment }

    //TODO Add stuff for witness generation

}
