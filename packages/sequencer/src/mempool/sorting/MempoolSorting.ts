import { PendingTransaction } from "../PendingTransaction";

export interface MempoolSorting {
  /**
   * Presorting happens on the backend (i.e. the DB), before the data travels to the sequencer.
   * It's very fast, but limited to only integer sorting.
   * The value returned here has to be static per transaction, since it will be sorted and
   * compared on the DB-side.
   *
   * @param tx
   * @returns Priority of the transaction - larger is better (therefore will be
   * put in the block first)
   */
  presortingPriority(tx: PendingTransaction): number;

  /**
   * Indicate whether to do pre-sorting (as it's expensive depending on your block size)
   */
  enablePostSorting(): boolean;

  /**
   * Postsorting happens on the sequencer-side. It's less fast but can take in any two
   * transactions and directly compare them based on arbitrary logic
   * @param a
   * @param b
   */
  postSorting(a: PendingTransaction, b: PendingTransaction): number;
}
