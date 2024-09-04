import { singleton } from "tsyringe";
import { Block } from "@proto-kit/sequencer";
import { Block as PrismaBlock } from "@prisma/client";
import { NetworkState } from "@proto-kit/protocol";
import { Field } from "o1js";

import { ObjectMapper } from "../../../ObjectMapper";

@singleton()
export class BlockMapper implements ObjectMapper<Block, PrismaBlock> {
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

      hash: Field(input.hash),
      height: Field(input.height),
      fromEternalTransactionsHash: Field(input.fromEternalTransactionsHash),
      toEternalTransactionsHash: Field(input.toEternalTransactionsHash),
      fromBlockHashRoot: Field(input.fromBlockHashRoot),
      fromMessagesHash: Field(input.fromMessagesHash),
      toMessagesHash: Field(input.toMessagesHash),

      transactionsHash: Field(input.transactionsHash),
      previousBlockHash:
        input.parentHash !== null ? Field(input.parentHash) : undefined,
    };
  }

  public mapOut(input: Block): PrismaBlock {
    return {
      height: Number(input.height.toBigInt()),
      beforeNetworkState: NetworkState.toJSON(input.networkState.before),
      duringNetworkState: NetworkState.toJSON(input.networkState.during),
      fromEternalTransactionsHash: input.fromEternalTransactionsHash.toString(),
      toEternalTransactionsHash: input.toEternalTransactionsHash.toString(),
      fromBlockHashRoot: input.fromBlockHashRoot.toString(),
      fromMessagesHash: input.fromMessagesHash.toString(),
      toMessagesHash: input.toMessagesHash.toString(),

      hash: input.hash.toString(),
      transactionsHash: input.transactionsHash.toString(),
      parentHash: input.previousBlockHash?.toString() ?? null,
      batchHeight: null,
    };
  }
}
