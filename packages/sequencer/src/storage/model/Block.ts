import { Bool, Field, Poseidon } from "o1js";
import {
  ACTIONS_EMPTY_HASH,
  BlockHashMerkleTree,
  BlockHashMerkleTreeWitness,
  BlockHashMerkleTreeWitnessJson,
  NetworkState,
  NetworkStateJson,
} from "@proto-kit/protocol";
import { LinkedMerkleTree } from "@proto-kit/common";

import { PendingTransaction, PendingTransactionJSONType } from "../../mempool/PendingTransaction";
import {
  UntypedStateTransition,
  UntypedStateTransitionJson,
} from "../../protocol/production/helpers/UntypedStateTransition";
import { FieldString } from "../../helpers/utils";

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

export interface StateTransitionBatchJson {
  stateTransitions: UntypedStateTransitionJson[];
  applied: boolean;
}

export interface TransactionExecutionResultJson {
  tx: PendingTransactionJSONType;
  stateTransitions: StateTransitionBatchJson[];
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
  height: FieldString;
  networkState: {
    before: NetworkStateJson;
    during: NetworkStateJson;
  };

  transactions: TransactionExecutionResultJson[];
  transactionsHash: FieldString;

  fromEternalTransactionsHash: FieldString;
  fromBlockHashRoot: FieldString;
  fromMessagesHash: FieldString;
  fromStateRoot: FieldString;
  toEternalTransactionsHash: FieldString;
  toMessagesHash: FieldString;

  beforeBlockStateTransitions: UntypedStateTransitionJson[];
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
  blockHash: string;
  witnessedRoots: [string];
  stateRoot: string;
  blockHashRoot: string;
  afterNetworkState: NetworkStateJson;
  afterBlockStateTransitions: UntypedStateTransitionJson[];
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

        height: FieldString(0),
        transactionsHash: FieldString(0),
        fromEternalTransactionsHash: FieldString(0),
        toEternalTransactionsHash: FieldString(0),
        transactions: [],
        networkState: {
          before: NetworkState.toJSON(NetworkState.empty()),
          during: NetworkState.toJSON(NetworkState.empty()),
        },
        fromBlockHashRoot: FieldString(BlockHashMerkleTree.EMPTY_ROOT),
        fromMessagesHash: FieldString(0),
        fromStateRoot: FieldString(LinkedMerkleTree.EMPTY_ROOT),
        toMessagesHash: FieldString(ACTIONS_EMPTY_HASH),
        beforeBlockStateTransitions: [],

        previousBlockHash: undefined,
      },
      result: {
        afterNetworkState: NetworkState.toJSON(NetworkState.empty()),
        stateRoot: String(LinkedMerkleTree.EMPTY_ROOT),
        blockHashRoot: String(BlockHashMerkleTree.EMPTY_ROOT),
        afterBlockStateTransitions: [],
        blockHashWitness: BlockHashMerkleTreeWitness.toJSON(BlockHashMerkleTree.WITNESS.dummy()),
        blockHash: "0",
        witnessedRoots: [String(LinkedMerkleTree.EMPTY_ROOT)],
      },
    }) satisfies BlockWithResult,
};

export function txResultToJson(
  txResult: TransactionExecutionResult
): TransactionExecutionResultJson {
  return {
    tx: txResult.tx.toJSON(),
    stateTransitions: txResult.stateTransitions.map((batch) => ({
      stateTransitions: batch.stateTransitions.map((st) => st.toJSON()),
      applied: batch.applied,
    })),
    status: txResult.status.toBoolean(),
    hooksStatus: txResult.hooksStatus.toBoolean(),
    statusMessage: txResult.statusMessage,
    events: txResult.events.map((e) => ({
      eventName: e.eventName,
      data: e.data.map((f) => f.toString()),
      source: e.source,
    })),
  };
}

export function txResultFromJson(
  json: TransactionExecutionResultJson
): TransactionExecutionResult {
  return {
    tx: PendingTransaction.fromJSON(json.tx),
    stateTransitions: json.stateTransitions.map((batch) => ({
      stateTransitions: batch.stateTransitions.map((st) =>
        UntypedStateTransition.fromJSON(st)
      ),
      applied: batch.applied,
    })),
    status: Bool(json.status),
    hooksStatus: Bool(json.hooksStatus),
    statusMessage: json.statusMessage,
    events: json.events.map((e) => ({
      eventName: e.eventName,
      data: e.data.map((f) => Field(f)),
      source: e.source,
    })),
  };
}

export function STBatchToJson(
  stBatch: StateTransitionBatch
): StateTransitionBatchJson {
  return {
    stateTransitions: stBatch.stateTransitions.map(
      (untypedST: UntypedStateTransition) => untypedST.toJSON()
    ),
    applied: stBatch.applied,
  };
}

export function STBatchFromJson(
  stBatch: StateTransitionBatchJson
): StateTransitionBatch {
  return {
    stateTransitions: stBatch.stateTransitions.map(
      (untypedST: UntypedStateTransitionJson) =>
        UntypedStateTransition.fromJSON(untypedST)
    ),
    applied: stBatch.applied,
  };
}


