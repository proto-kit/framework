import { Bool, Field, Poseidon } from "o1js";
import {
  ACTIONS_EMPTY_HASH,
  BlockHashMerkleTree,
  BlockHashMerkleTreeWitness,
  BlockHashMerkleTreeWitnessJson,
  ProvableNetworkState,
  NetworkState,
} from "@proto-kit/protocol";
import { LinkedMerkleTree } from "@proto-kit/common";

import {
  PendingTransaction,
} from "../../mempool/PendingTransaction";
import {
  UntypedStateTransition,
} from "../../protocol/production/helpers/UntypedStateTransition";
import { FieldString } from "../../helpers/utils";

export interface StateTransitionBatch {
  stateTransitions: UntypedStateTransition[];
  applied: boolean;
}

export interface TransactionExecutionResult {
  tx: PendingTransaction;
  stateTransitions: StateTransitionBatch[];
  status: boolean;
  hooksStatus: boolean;
  statusMessage?: string;
  events: {
    eventName: string;
    data: FieldString[];
    source: "afterTxHook" | "beforeTxHook" | "runtime";
  }[];
}

// TODO Why is Block using Fields, but BlockResult bigints? Align that towards the best option

export interface Block {
  hash: FieldString;
  previousBlockHash: FieldString | undefined;
  height: number;
  networkState: {
    before: NetworkState;
    during: NetworkState;
  };

  transactions: TransactionExecutionResult[];
  transactionsHash: FieldString;

  fromEternalTransactionsHash: FieldString;
  fromBlockHashRoot: FieldString;
  fromMessagesHash: FieldString;
  fromStateRoot: FieldString;
  toEternalTransactionsHash: FieldString;
  toMessagesHash: FieldString;

  beforeBlockStateTransitions: UntypedStateTransition[];
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Block = {
  calculateHash(height: Field, transactionsHash: Field): Field {
    return Poseidon.hash([height, transactionsHash]);
  },

  hash(block: Omit<Block, "hash">): Field {
    return Block.calculateHash(
      Field(block.height),
      Field(block.transactionsHash)
    );
  },
};

export interface BlockResult {
  blockHash: FieldString;
  witnessedRoots: [FieldString];
  stateRoot: FieldString;
  blockHashRoot: FieldString;
  afterNetworkState: NetworkState;
  afterBlockStateTransitions: UntypedStateTransition[];
  blockHashWitness: BlockHashMerkleTreeWitnessJson;
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
  // toBlockProverState: ({ block, result }: BlockWithResult) => ({
  //   stateRoot: result.stateRoot,
  //
  // } satisfies BlockProverStateCommitments),

  createEmpty: () =>
    ({
      block: {
        hash: FieldString(0),

        height: 0,
        transactionsHash: FieldString(0),
        fromEternalTransactionsHash: FieldString(0),
        toEternalTransactionsHash: FieldString(0),
        transactions: [],
        networkState: {
          before: ProvableNetworkState.toJSON(ProvableNetworkState.empty()),
          during: ProvableNetworkState.toJSON(ProvableNetworkState.empty()),
        },
        fromBlockHashRoot: FieldString(BlockHashMerkleTree.EMPTY_ROOT),
        fromMessagesHash: FieldString(0),
        fromStateRoot: FieldString(LinkedMerkleTree.EMPTY_ROOT),
        toMessagesHash: FieldString(ACTIONS_EMPTY_HASH),
        beforeBlockStateTransitions: [],

        previousBlockHash: undefined,
      },
      result: {
        afterNetworkState: ProvableNetworkState.toJSON(ProvableNetworkState.empty()),
        stateRoot: FieldString(LinkedMerkleTree.EMPTY_ROOT),
        blockHashRoot: FieldString(BlockHashMerkleTree.EMPTY_ROOT),
        afterBlockStateTransitions: [],
        blockHashWitness: BlockHashMerkleTreeWitness.toJSON(
          BlockHashMerkleTree.WITNESS.dummy()
        ),
        blockHash: "0",
        witnessedRoots: [String(LinkedMerkleTree.EMPTY_ROOT)],
      },
    }) satisfies BlockWithResult,
};
