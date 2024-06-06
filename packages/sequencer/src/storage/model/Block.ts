import { JsonProof } from "o1js";
import { NetworkState } from "@proto-kit/protocol";

import { PendingTransaction } from "../../mempool/PendingTransaction";

export interface ComputedBlockTransaction {
  tx: PendingTransaction;
  status: boolean;
  statusMessage?: string;
}

export interface ComputedBlock {
  proof: JsonProof;
  bundles: string[];
  height: number;
}

export interface SettleableBatch extends ComputedBlock {
  fromNetworkState: NetworkState;
  toNetworkState: NetworkState;
}
