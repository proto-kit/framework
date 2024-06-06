import { EventEmittingComponent } from "@proto-kit/common";

import type { PendingTransaction } from "./PendingTransaction";

export type MempoolEvents = {
  "mempool-transaction-added": [PendingTransaction];
};

export interface Mempool<Events extends MempoolEvents = MempoolEvents>
  extends EventEmittingComponent<Events> {
  /**
   * Add a transaction to the mempool
   * @returns The new commitment to the mempool
   */
  add: (tx: PendingTransaction) => Promise<boolean>;

  /**
   * Retrieve all transactions that are currently in the mempool
   */
  getTxs: () => Promise<PendingTransaction[]>;
}
