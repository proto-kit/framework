import { BlockProverPublicInput, BlockProverPublicOutput } from "@yab/protocol";
import { Proof } from "snarkyjs";

import { PendingTransaction } from "../../mempool/PendingTransaction";

export interface ComputedBlock {
  proof: Proof<BlockProverPublicInput, BlockProverPublicOutput>;
  txs: PendingTransaction[];
}
