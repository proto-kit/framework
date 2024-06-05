import { NetworkState } from "../model/network/NetworkState";
import { ProvableBlockHook } from "../protocol/ProvableBlockHook";

export class BlockHeightHook extends ProvableBlockHook<Record<string, never>> {
  public async afterBlock(networkState: NetworkState): Promise<NetworkState> {
    return new NetworkState({
      block: {
        height: networkState.block.height.add(1),
      },
      previous: networkState.previous,
    });
  }

  public async beforeBlock(networkState: NetworkState): Promise<NetworkState> {
    return networkState;
  }
}
