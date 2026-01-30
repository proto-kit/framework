import { Bool, Field, Poseidon } from "o1js";
import {
  ACTIONS_EMPTY_HASH,
  BlockHashMerkleTree,
  BlockHashMerkleTreeWitness,
  NetworkState,
} from "@proto-kit/protocol";
import { LinkedMerkleTree } from "@proto-kit/common";

import { PendingTransaction } from "../../mempool/PendingTransaction";
import { UntypedStateTransition } from "../../protocol/production/helpers/UntypedStateTransition";

export interface StateTransitionBatch {
  stateTransitions: UntypedStateTransition[];
  applied: boolean;
}

export interface TransactionExecutionResult {
  tx: PendingTransaction;
  stateTransitions: StateTransitionBatch[];
  status: Bool;
  hooksStatus: Bool;
  statusMessage?: string;
  events: {
    eventName: string;
    data: Field[];
    source: "afterTxHook" | "beforeTxHook" | "runtime";
  }[];
}

// TODO Why is Block using Fields, but BlockResult bigints? Align that towards the best option

export interface Block {
  hash: Field;
  previousBlockHash: Field | undefined;
  height: Field;
  networkState: {
    before: NetworkState;
    during: NetworkState;
  };

  transactions: TransactionExecutionResult[];
  transactionsHash: Field;

  fromEternalTransactionsHash: Field;
  fromBlockHashRoot: Field;
  fromMessagesHash: Field;
  fromStateRoot: Field;
  toEternalTransactionsHash: Field;
  toMessagesHash: Field;

  beforeBlockStateTransitions: UntypedStateTransition[];
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Block = {
  calculateHash(height: Field, transactionsHash: Field): Field {
    return Poseidon.hash([height, transactionsHash]);
  },

  hash(block: Omit<Block, "hash">): Field {
    return Block.calculateHash(block.height, block.transactionsHash);
  },
};

export interface BlockResult {
  blockHash: bigint;
  witnessedRoots: [bigint];
  stateRoot: bigint;
  blockHashRoot: bigint;
  afterNetworkState: NetworkState;
  afterBlockStateTransitions: UntypedStateTransition[];
  blockHashWitness: BlockHashMerkleTreeWitness;
}

export interface BlockWithResult {
  block: Block;
  result: BlockResult;
}

export interface BlockWithMaybeResult {
  block: Block;
  result?: BlockResult;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const BlockWithResult = {
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
        fromStateRoot: LinkedMerkleTree.EMPTY_ROOT,
        toMessagesHash: ACTIONS_EMPTY_HASH,
        beforeBlockStateTransitions: [],

        previousBlockHash: undefined,
      },
      result: {
        afterNetworkState: NetworkState.empty(),
        stateRoot: LinkedMerkleTree.EMPTY_ROOT.toBigInt(),
        blockHashRoot: BlockHashMerkleTree.EMPTY_ROOT,
        afterBlockStateTransitions: [],
        blockHashWitness: BlockHashMerkleTree.WITNESS.dummy(),
        blockHash: 0n,
        witnessedRoots: [LinkedMerkleTree.EMPTY_ROOT.toBigInt()],
      },
    }) satisfies BlockWithResult,
};
