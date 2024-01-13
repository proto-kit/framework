import { Bool, Field } from "o1js";
import {
  BlockHashMerkleTree,
  BlockHashMerkleTreeWitness,
  NetworkState,
} from "@proto-kit/protocol";

import { PendingTransaction } from "../../mempool/PendingTransaction";
import { UntypedStateTransition } from "../../protocol/production/helpers/UntypedStateTransition";
import { RollupMerkleTree } from "@proto-kit/common";

export interface TransactionExecutionResult {
  tx: PendingTransaction;
  stateTransitions: UntypedStateTransition[];
  protocolTransitions: UntypedStateTransition[];
  status: Bool;
  statusMessage?: string;
}

export interface UnprovenBlock {
  height: Field;
  networkState: {
    before: NetworkState;
    during: NetworkState;
  };
  transactions: TransactionExecutionResult[];
  transactionsHash: Field;
  toEternalTransactionsHash: Field;
  fromEternalTransactionsHash: Field;
  fromBlockHashRoot: Field;
  previousBlockTransactionsHash: Field | undefined;
}

export interface UnprovenBlockMetadata {
  stateRoot: bigint;
  blockHashRoot: bigint;
  afterNetworkState: NetworkState;
  blockStateTransitions: UntypedStateTransition[];
  blockHashWitness: BlockHashMerkleTreeWitness;
  blockTransactionsHash: bigint;
}

export interface UnprovenBlockWithMetadata {
  block: UnprovenBlock;
  metadata: UnprovenBlockMetadata;
}

export const UnprovenBlockWithMetadata = {
  createEmpty: () =>
    ({
      block: {
        height: Field(0),
        transactionsHash: Field(0),
        fromEternalTransactionsHash: Field(0),
        toEternalTransactionsHash: Field(0),
        transactions: [],
        networkState: {
          before: NetworkState.empty(),
          during: NetworkState.empty(),
        },
        fromBlockHashRoot: Field(BlockHashMerkleTree.EMPTY_ROOT),
        previousBlockTransactionsHash: undefined,
      },
      metadata: {
        afterNetworkState: NetworkState.empty(),
        stateRoot: RollupMerkleTree.EMPTY_ROOT,
        blockHashRoot: BlockHashMerkleTree.EMPTY_ROOT,
        blockStateTransitions: [],
        blockHashWitness: BlockHashMerkleTree.WITNESS.dummy(),
        blockTransactionsHash: 0n,
      },
    } satisfies UnprovenBlockWithMetadata),
};
