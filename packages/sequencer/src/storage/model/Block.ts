import {
  BlockProverPublicInput,
  BlockProverPublicOutput,
} from "@proto-kit/protocol";
import { Proof } from "snarkyjs";

import { PendingTransaction } from "../../mempool/PendingTransaction";

export interface ComputedBlockTransaction {
  tx: PendingTransaction;
  status: boolean;
  statusMessage?: string;
}

export interface ComputedBlock {
  proof: Proof<BlockProverPublicInput, BlockProverPublicOutput>;
  txs: ComputedBlockTransaction[];
}
