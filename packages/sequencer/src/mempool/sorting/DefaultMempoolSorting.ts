import { noop } from "@proto-kit/common";

import { PendingTransaction } from "../PendingTransaction";
import {
  SequencerModule,
  sequencerModule,
} from "../../sequencer/builder/SequencerModule";

import { MempoolSorting } from "./MempoolSorting";

@sequencerModule()
export class DefaultMempoolSorting
  extends SequencerModule
  implements MempoolSorting
{
  public async start() {
    noop();
  }

  public enablePostSorting(): boolean {
    return false;
  }

  public postSorting(transactions: PendingTransaction[]): PendingTransaction[] {
    return transactions;
  }

  public presortingPriority(tx: PendingTransaction): number {
    // This means we order by first in, first out in the db
    return Date.UTC(2500, 0) - Date.now();
  }
}
