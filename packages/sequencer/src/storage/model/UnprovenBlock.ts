import { Bool, Field } from "o1js";
import { NetworkState } from "@proto-kit/protocol";

import { PendingTransaction } from "../../mempool/PendingTransaction";
import { UntypedStateTransition } from "../../protocol/production/helpers/UntypedStateTransition";
import { StateRecord } from "../../protocol/production/BlockProducerModule";

export interface TransactionExecutionResult {
  tx: PendingTransaction;
  stateTransitions: UntypedStateTransition[];
  protocolTransitions: UntypedStateTransition[];
  status: Bool;
  statusMessage?: string;
  /**
   * TODO Remove
   * @deprecated
   */
  stateDiff: StateRecord;
}

export interface UnprovenBlock {
  networkState: NetworkState;
  transactions: TransactionExecutionResult[];
  transactionsHash: Field;
}

export interface UnprovenBlockMetadata {
  resultingStateRoot: bigint;
  resultingNetworkState: NetworkState;
}
