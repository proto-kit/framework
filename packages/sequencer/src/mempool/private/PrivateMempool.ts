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

    validateTx(tx: PendingTransaction) : boolean {

        let valid = tx.signature.verify(tx.sender, tx.getSignatureData())

        return valid.toBoolean()

    }

    add(tx: PendingTransaction): MempoolCommitment {

        if(this.validateTx(tx)) {
            this.queue.push(tx)
            this.commitment = Poseidon.hash([this.commitment, tx.hash()]) //TODO Figure out how to generalize this
        }
        return { txListCommitment: this.commitment };
    }

    getTxs(): { txs: PendingTransaction[]; commitment: MempoolCommitment } {
        return { commitment: { txListCommitment: this.commitment } , txs: this.queue };
    }

}