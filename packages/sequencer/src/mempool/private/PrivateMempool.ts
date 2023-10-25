import { Field, Poseidon } from "o1js";
import { noop } from "@proto-kit/common";

import type { Mempool, MempoolCommitment } from "../Mempool.js";
import type { PendingTransaction } from "../PendingTransaction.js";
import { SequencerModule } from "../../sequencer/builder/SequencerModule";
import { TransactionValidator } from "../verification/TransactionValidator";

export class PrivateMempool extends SequencerModule<object> implements Mempool {
  public commitment: Field;

  private queue: PendingTransaction[] = [];

  public constructor(
    private readonly transactionValidator: TransactionValidator
  ) {
    super();
    this.commitment = Field(0);
  }

  public add(tx: PendingTransaction): MempoolCommitment {
    const [txValid, error] = this.transactionValidator.validateTx(tx);
    if (txValid) {
      this.queue.push(tx);

      // Figure out how to generalize this
      this.commitment = Poseidon.hash([this.commitment, tx.hash()]);

      return { transactionsHash: this.commitment };
    }
    throw new Error(`Valdiation of tx failed: ${error ?? "unknown error"}`);
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
