import { JsonProof } from "o1js";
import { NetworkStateJson } from "@proto-kit/protocol";

import { PendingTransaction } from "../../mempool/PendingTransaction";

export interface BatchTransaction {
  tx: PendingTransaction;
  status: boolean;
  statusMessage?: string;
}

export interface Batch {
  proof: JsonProof;
  blockHashes: string[];
  height: number;
}

export interface SettleableBatch extends Batch {
  fromNetworkState: NetworkStateJson;
  toNetworkState: NetworkStateJson;
}
