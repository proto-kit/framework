import {
  BlockProverPublicInput,
  BlockProverPublicOutput,
} from "@proto-kit/protocol";
import { Proof } from "snarkyjs";

import { PendingTransaction } from "../../mempool/PendingTransaction";

export interface ComputedBlock {
  proof: Proof<BlockProverPublicInput, BlockProverPublicOutput>;
  txs: PendingTransaction[];
}
