import { NetworkState } from "../model/network/NetworkState";
import {
  AfterBundleParameters,
  BeforeBundleParameters,
  ProvableBlockHook,
} from "../protocol/ProvableBlockHook";

export class BlockHeightHook extends ProvableBlockHook<Record<string, never>> {
  public afterBundle({ networkState }: AfterBundleParameters): NetworkState {
    return new NetworkState({
      block: {
        height: networkState.block.height.add(1),
      },
    });
  }

  public beforeBundle(blockData: BeforeBundleParameters): NetworkState {
    return blockData.networkState;
  }
}
