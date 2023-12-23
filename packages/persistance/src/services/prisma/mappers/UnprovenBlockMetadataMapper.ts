import { singleton } from "tsyringe";
import { ObjectMapper } from "../../../ObjectMapper";
import { UnprovenBlockMetadata } from "@proto-kit/sequencer";
import { UnprovenBlockMetadata as DBUnprovenBlockMetadata } from "@prisma/client";
import { NetworkState } from "@proto-kit/protocol";

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
    };
  }

  public mapOut(
    input: UnprovenBlockMetadata
  ): Omit<DBUnprovenBlockMetadata, "height"> {
    return {
      resultingStateRoot: input.resultingStateRoot.toString(),

      resultingNetworkState: NetworkState.toJSON(input.resultingNetworkState),
    };
  }
}
