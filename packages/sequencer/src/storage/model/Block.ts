import { JsonProof } from "o1js";
import { NetworkState } from "@proto-kit/protocol";

import { PendingTransaction } from "../../mempool/PendingTransaction";
import { UntypedStateTransition } from "../../protocol/production/helpers/UntypedStateTransition";

export interface ComputedBlockTransaction {
  tx: PendingTransaction;
  status: boolean;
  statusMessage?: string;
  stateTransitions: UntypedStateTransition[];
  protocolTransitions: UntypedStateTransition[];
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
