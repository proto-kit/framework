import { singleton } from "tsyringe";
import { Block } from "@proto-kit/sequencer";
import { Block as PrismaBlock } from "@prisma/client";
import { NetworkState } from "@proto-kit/protocol";
import { Field } from "o1js";

import { ObjectMapper } from "../../../ObjectMapper";

import { StateTransitionArrayMapper } from "./StateTransitionMapper";

@singleton()
export class BlockMapper implements ObjectMapper<Block, PrismaBlock> {
  public constructor(
    private readonly stArrayMapper: StateTransitionArrayMapper
  ) {}

  public mapIn(input: PrismaBlock): Block {
    return {
      transactions: [],

      networkState: {
        before: new NetworkState(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          NetworkState.fromJSON(input.beforeNetworkState as any)
        ),
        during: new NetworkState(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          NetworkState.fromJSON(input.duringNetworkState as any)
        ),
      },

      hash: input.hash,
      height: input.height.toString(),
      fromEternalTransactionsHash: input.fromEternalTransactionsHash,
      toEternalTransactionsHash: input.toEternalTransactionsHash,
      fromBlockHashRoot: input.fromBlockHashRoot,
      fromMessagesHash: input.fromMessagesHash,
      toMessagesHash: input.toMessagesHash,
      fromStateRoot: input.fromStateRoot,

      transactionsHash: input.transactionsHash,
      previousBlockHash:
        input.parentHash !== null ? input.parentHash : undefined,

      beforeBlockStateTransitions: this.stArrayMapper.mapIn(
        input.beforeBlockStateTransitions
      ),
    };
  }

  public mapOut(input: Block): PrismaBlock {
    return {
      height: Number(input.height),
      beforeNetworkState: NetworkState.toJSON(input.networkState.before),
      duringNetworkState: NetworkState.toJSON(input.networkState.during),
      fromEternalTransactionsHash: input.fromEternalTransactionsHash,
      toEternalTransactionsHash: input.toEternalTransactionsHash,
      fromBlockHashRoot: input.fromBlockHashRoot,
      fromMessagesHash: input.fromMessagesHash,
      toMessagesHash: input.toMessagesHash,
      fromStateRoot: input.fromStateRoot,

      hash: input.hash,
      transactionsHash: input.transactionsHash,
      parentHash: input.previousBlockHash ?? null,
      batchHeight: null,

      beforeBlockStateTransitions: this.stArrayMapper.mapOut(
        input.beforeBlockStateTransitions
      ),
    };
  }
}
