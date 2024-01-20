import { Provable } from "o1js";
import { NetworkState } from "../model/network/NetworkState";
import { ProvableBlockHook } from "../protocol/ProvableBlockHook";

export class BlockHeightHook extends ProvableBlockHook<Record<string, never>> {
  public afterBlock(networkState: NetworkState): NetworkState {
    return new NetworkState({
      block: {
        height: networkState.block.height.add(1),
      },
    });
  }

  public beforeBlock(networkState: NetworkState): NetworkState {
    return networkState;
  }
}
