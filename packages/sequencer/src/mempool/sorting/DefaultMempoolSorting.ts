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

  public postSorting(a: PendingTransaction, b: PendingTransaction): number {
    return 0;
  }

  public presortingPriority(tx: PendingTransaction): number {
    return 0;
  }
}
