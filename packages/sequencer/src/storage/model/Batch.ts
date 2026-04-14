import { JsonProof } from "o1js";
import { NetworkState } from "@proto-kit/protocol";

export interface Batch {
  proof: JsonProof;
  blockHashes: string[];
  height: number;
  createdAt: Date;
}

export interface SettleableBatch extends Batch {
  fromNetworkState: NetworkState;
  toNetworkState: NetworkState;
}
