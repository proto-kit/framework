import { JsonProof } from "o1js";

import { PendingTransaction } from "../../mempool/PendingTransaction";

export interface ComputedBlockTransaction {
  tx: PendingTransaction;
  status: boolean;
  statusMessage?: string;
}

export interface ComputedBlock {
  proof: JsonProof;
  bundles: string[];
}
