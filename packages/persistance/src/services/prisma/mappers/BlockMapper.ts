import { singleton } from "tsyringe";
import { Block } from "@proto-kit/sequencer";
import {
  Block as PrismaBlock,
  StateTransition as DBStateTransition,
  StateTransitionBatch as DBStateTransitionBatch,
} from "@prisma/client";
import { NetworkState } from "@proto-kit/protocol";
import { Field } from "o1js";

import { ObjectMapper } from "../../../ObjectMapper";

import { StateTransitionBatchArrayMapper } from "./StateTransitionMapper";

@singleton()
export class BlockMapper
  implements
    ObjectMapper<
      Block,
      [
        PrismaBlock,
        [
          Omit<
            DBStateTransitionBatch,
            "txExecutionResultId" | "id" | "blockId" | "blockResultId"
          >,
          Omit<DBStateTransition, "batchId" | "id">[],
        ][],
      ]
    >
{
  public constructor(
    private readonly stArrayMapper: StateTransitionBatchArrayMapper
  ) {}

  public mapIn(
    input: [
      PrismaBlock,
      [
        Omit<
          DBStateTransitionBatch,
          "txExecutionResultId" | "id" | "blockId" | "blockResultId"
        >,
        Omit<DBStateTransition, "batchId" | "id">[],
      ][],
    ]
  ): Block {
    const block = input[0];
    const stBatch = input[1];
    return {
      transactions: [],

      networkState: {
        before: new NetworkState(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          NetworkState.fromJSON(block.beforeNetworkState as any)
        ),
        during: new NetworkState(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          NetworkState.fromJSON(block.duringNetworkState as any)
        ),
      },

      hash: Field(block.hash),
      height: Field(block.height),
      fromEternalTransactionsHash: Field(block.fromEternalTransactionsHash),
      toEternalTransactionsHash: Field(block.toEternalTransactionsHash),
      fromBlockHashRoot: Field(block.fromBlockHashRoot),
      fromMessagesHash: Field(block.fromMessagesHash),
      toMessagesHash: Field(block.toMessagesHash),
      fromStateRoot: Field(block.fromStateRoot),

      transactionsHash: Field(block.transactionsHash),
      previousBlockHash:
        block.parentHash !== null ? Field(block.parentHash) : undefined,

      beforeBlockStateTransitions:
        this.stArrayMapper.mapIn(stBatch)[0].stateTransitions,
    };
  }

  public mapOut(
    input: Block
  ): [
    PrismaBlock,
    [
      Omit<
        DBStateTransitionBatch,
        "txExecutionResultId" | "id" | "blockId" | "blockResultId"
      >,
      Omit<DBStateTransition, "batchId" | "id">[],
    ][],
  ] {
    const block = {
      height: Number(input.height.toBigInt()),
      beforeNetworkState: NetworkState.toJSON(input.networkState.before),
      duringNetworkState: NetworkState.toJSON(input.networkState.during),
      fromEternalTransactionsHash: input.fromEternalTransactionsHash.toString(),
      toEternalTransactionsHash: input.toEternalTransactionsHash.toString(),
      fromBlockHashRoot: input.fromBlockHashRoot.toString(),
      fromMessagesHash: input.fromMessagesHash.toString(),
      toMessagesHash: input.toMessagesHash.toString(),
      fromStateRoot: input.fromStateRoot.toString(),

      hash: input.hash.toString(),
      transactionsHash: input.transactionsHash.toString(),
      parentHash: input.previousBlockHash?.toString() ?? null,
      batchHeight: null,
    };
    const stBatches = this.stArrayMapper.mapOut([
      { stateTransitions: input.beforeBlockStateTransitions, applied: true },
    ]);
    return [block, stBatches];
  }
}
