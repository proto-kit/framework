import { NetworkState } from "../model/network/NetworkState";
import {
  AfterBlockParameters,
  ProvableBlockHook,
} from "../protocol/ProvableBlockHook";

export class BlockHeightHook extends ProvableBlockHook<Record<string, never>> {
  public afterBlock({ networkState }: AfterBlockParameters): NetworkState {
    return new NetworkState({
      block: {
        height: networkState.block.height.add(1),
      },
    });
  }
}
