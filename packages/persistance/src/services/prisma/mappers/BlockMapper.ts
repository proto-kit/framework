import { singleton } from "tsyringe";
import { UnprovenBlock } from "@proto-kit/sequencer";
import { Block } from "@prisma/client";
import { NetworkState } from "@proto-kit/protocol";
import { Field } from "o1js";

import { ObjectMapper } from "../../../ObjectMapper";

@singleton()
export class BlockMapper implements ObjectMapper<UnprovenBlock, Block> {
  public mapIn(input: Block): UnprovenBlock {
    return {
      transactions: [],

      networkState: new NetworkState(
        NetworkState.fromJSON(input.networkState as any)
      ),

      transactionsHash: Field(input.transactionsHash),
    };
  }

  public mapOut(input: UnprovenBlock): Block {
    return {
      height: Number(input.networkState.block.height.toBigInt()),
      networkState: NetworkState.toJSON(input.networkState),
      transactionsHash: input.transactionsHash.toString(),
      batchHeight: null,
    };
  }
}
