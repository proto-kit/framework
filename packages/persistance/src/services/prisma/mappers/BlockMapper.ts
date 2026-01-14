import { singleton } from "tsyringe";
import {
  Block,
  UntypedStateTransition,
  UntypedStateTransitionJson,
} from "@proto-kit/sequencer";
import { Prisma, Block as PrismaBlock } from "@prisma/client";
import { NetworkStateJson } from "@proto-kit/protocol";

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

      // This is cleaner to keep mapIn
      beforeBlockStateTransitions: input.beforeBlockStateTransitions as unknown as UntypedStateTransitionJson[]
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

      beforeBlockStateTransitions: input.beforeBlockStateTransitions as unknown as Prisma.JsonArray 
    };
  }
}
