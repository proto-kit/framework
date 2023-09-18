import { Field, Poseidon } from "snarkyjs";
import { noop } from "@proto-kit/common";

import type { Mempool, MempoolCommitment } from "../Mempool.js";
import type { PendingTransaction } from "../PendingTransaction.js";
import { SequencerModule } from "../../sequencer/builder/SequencerModule";

export class PrivateMempool extends SequencerModule<object> implements Mempool {
  public commitment: Field;

  public constructor(private queue: PendingTransaction[] = []) {
    super();
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

  public removeTxs(txs: PendingTransaction[]): boolean {
    const { length } = this.queue;
    this.queue = this.queue.filter((tx) => !txs.includes(tx));
    // Check that all elements have been removed and were in the mempool prior
    // eslint-disable-next-line unicorn/consistent-destructuring
    return length === this.queue.length + txs.length;
  }

  public async start(): Promise<void> {
    noop();
  }
}
