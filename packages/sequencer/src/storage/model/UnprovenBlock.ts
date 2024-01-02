import { Bool, Field } from "o1js";
import { NetworkState } from "@proto-kit/protocol";

import { PendingTransaction } from "../../mempool/PendingTransaction";
import { UntypedStateTransition } from "../../protocol/production/helpers/UntypedStateTransition";

export interface TransactionExecutionResult {
  tx: PendingTransaction;
  stateTransitions: UntypedStateTransition[];
  protocolTransitions: UntypedStateTransition[];
  status: Bool;
  statusMessage?: string;
}

export interface UnprovenBlock {
  networkState: NetworkState;
  transactions: TransactionExecutionResult[];
  transactionsHash: Field;
  previousBlockTransactionsHash: Field | undefined;
}

export interface UnprovenBlockMetadata {
  resultingStateRoot: bigint;
  resultingNetworkState: NetworkState;
  blockTransactionsHash: bigint;
}
