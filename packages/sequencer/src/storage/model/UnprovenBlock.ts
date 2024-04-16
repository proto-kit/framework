import { Bool, Field, Poseidon } from "o1js";
import {
  ACTIONS_EMPTY_HASH,
  BlockHashMerkleTree,
  BlockHashMerkleTreeWitness,
  NetworkState,
} from "@proto-kit/protocol";
import { RollupMerkleTree } from "@proto-kit/common";

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
  hash: Field;

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
  fromMessagesHash: Field;
  toMessagesHash: Field;

  previousBlockHash: Field | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const UnprovenBlock = {
  calculateHash(height: Field, transactionsHash: Field): Field {
    return Poseidon.hash([height, transactionsHash]);
  },

  hash(block: Omit<UnprovenBlock, "hash">): Field {
    return UnprovenBlock.calculateHash(block.height, block.transactionsHash);
  },
};

export interface UnprovenBlockMetadata {
  blockHash: bigint;

  stateRoot: bigint;
  blockHashRoot: bigint;
  afterNetworkState: NetworkState;
  blockStateTransitions: UntypedStateTransition[];
  blockHashWitness: BlockHashMerkleTreeWitness;
}

export interface UnprovenBlockWithMetadata {
  block: UnprovenBlock;
  metadata: UnprovenBlockMetadata;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const UnprovenBlockWithMetadata = {
  createEmpty: () =>
    ({
      block: {
        hash: Field(0),

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
        fromMessagesHash: Field(0),
        toMessagesHash: ACTIONS_EMPTY_HASH,

        previousBlockHash: undefined,
      },
      metadata: {
        afterNetworkState: NetworkState.empty(),
        stateRoot: RollupMerkleTree.EMPTY_ROOT,
        blockHashRoot: BlockHashMerkleTree.EMPTY_ROOT,
        blockStateTransitions: [],
        blockHashWitness: BlockHashMerkleTree.WITNESS.dummy(),
        blockHash: 0n,
      },
    }) satisfies UnprovenBlockWithMetadata,
};
