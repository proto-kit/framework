import { singleton } from "tsyringe";
import { Block } from "@proto-kit/sequencer";
import { Block as PrismaBlock } from "@prisma/client";
import { NetworkState, NetworkStateJson } from "@proto-kit/protocol";
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
        before: 
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          input.beforeNetworkState as NetworkStateJson
        ,
        during:
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          input.duringNetworkState as NetworkStateJson

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
      beforeNetworkState: input.networkState.before,
      duringNetworkState: input.networkState.during,
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
