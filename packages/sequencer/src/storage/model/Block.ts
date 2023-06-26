import { BlockProverPublicInput } from "@yab/protocol";
import { Proof } from "snarkyjs";

import { PendingTransaction } from "../../mempool/PendingTransaction";

export interface ComputedBlock {
  proof: Proof<BlockProverPublicInput>;
  txs: PendingTransaction[];
}
