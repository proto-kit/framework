import { noop } from "@proto-kit/common";

import { sequencerModule } from "../../sequencer/builder/SequencerModule";
import { PendingTransaction } from "../PendingTransaction";

import { MempoolSorting } from "./MempoolSorting";
import { DefaultMempoolSorting } from "./DefaultMempoolSorting";

@sequencerModule()
export class NonceMempoolSorting
  extends DefaultMempoolSorting
  implements MempoolSorting
{
  public enablePostSorting(): boolean {
    return true;
  }

  public postSorting(a: PendingTransaction, b: PendingTransaction): number {
    if (a.sender.equals(b.sender).toBoolean()) {
      return Number(a.nonce.toBigInt() - b.nonce.toBigInt());
    } else {
      // Return 0, i.e. a should come before b (stuff stays in-order)
      return 0;
    }
  }

  public async start() {
    noop();
  }
}
