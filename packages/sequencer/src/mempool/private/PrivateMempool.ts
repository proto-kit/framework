import { Field, Poseidon } from "snarkyjs";

import type { Mempool, MempoolCommitment } from "../Mempool.js";
import type { PendingTransaction } from "../PendingTransaction.js";

export class PrivateMempool implements Mempool {
  public commitment: Field;

  public constructor(private queue: PendingTransaction[] = []) {
    this.commitment = Field(0);
  }

  public validateTx(tx: PendingTransaction): boolean {
    const valid = tx.signature.verify(tx.sender, tx.getSignatureData());

    return valid.toBoolean();
  }

  public add(tx: PendingTransaction): MempoolCommitment {
    if (this.validateTx(tx)) {
      this.queue.push(tx);

      // Figure out how to generalize this
      this.commitment = Poseidon.hash([this.commitment, tx.hash()]);
    }
    return { transactionsHash: this.commitment };
  }

  public getTxs(): {
    txs: PendingTransaction[];
    commitment: MempoolCommitment;
  } {
    return {
      commitment: { transactionsHash: this.commitment },
      txs: this.queue,
    };
  }

  public clear() {
    this.queue = [];
  }
}
