import { ProvableNetworkState } from "../model/network/NetworkState";
import { ProvableBlockHook } from "../protocol/ProvableBlockHook";

export class BlockHeightHook extends ProvableBlockHook<Record<string, never>> {
  public async afterBlock(
    networkState: ProvableNetworkState
  ): Promise<ProvableNetworkState> {
    return new ProvableNetworkState({
      block: {
        height: networkState.block.height.add(1),
      },
      previous: networkState.previous,
    });
  }

  public async beforeBlock(
    networkState: ProvableNetworkState
  ): Promise<ProvableNetworkState> {
    return networkState;
  }
}
