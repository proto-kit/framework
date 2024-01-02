import { singleton } from "tsyringe";
import { UnprovenBlockMetadata } from "@proto-kit/sequencer";
import { UnprovenBlockMetadata as DBUnprovenBlockMetadata } from "@prisma/client";
import { NetworkState } from "@proto-kit/protocol";

import { ObjectMapper } from "../../../ObjectMapper";

@singleton()
export class UnprovenBlockMetadataMapper
  implements
    ObjectMapper<
      UnprovenBlockMetadata,
      Omit<DBUnprovenBlockMetadata, "height">
    >
{
  public mapIn(
    input: Omit<DBUnprovenBlockMetadata, "height">
  ): UnprovenBlockMetadata {
    return {
      resultingStateRoot: BigInt(input.resultingStateRoot),
      resultingNetworkState: new NetworkState(
        NetworkState.fromJSON(input.resultingNetworkState as any)
      ),
      blockTransactionsHash: BigInt(input.blockTransactionHash),
    };
  }

  public mapOut(
    input: UnprovenBlockMetadata
  ): Omit<DBUnprovenBlockMetadata, "height"> {
    return {
      resultingStateRoot: input.resultingStateRoot.toString(),
      blockTransactionHash: input.blockTransactionsHash.toString(),

      resultingNetworkState: NetworkState.toJSON(input.resultingNetworkState),
    };
  }
}
