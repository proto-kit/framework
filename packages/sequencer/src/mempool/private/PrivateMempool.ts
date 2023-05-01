import {Mempool, MempoolCommitment} from "../Mempool.js";
import {PendingTransaction} from "../PendingTransaction.js";
import {Field, Poseidon} from "snarkyjs";

export class PrivateMempool implements Mempool {

    queue: PendingTransaction[]
    commitment: Field

    constructor() {
        this.queue = []
        this.commitment = Field(0)
    }

    add(tx: PendingTransaction): MempoolCommitment {
        this.queue.push(tx)
        this.commitment = Poseidon.hash([this.commitment, tx.hash()]) //TODO Figure out how to generalize this
        return { txListCommitment: this.commitment };
    }

    getTxs(): { txs: PendingTransaction[]; commitment: MempoolCommitment } {
        return { commitment: { txListCommitment: this.commitment } , txs: this.queue };
    }

}