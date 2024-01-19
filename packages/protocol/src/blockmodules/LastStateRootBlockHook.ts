import {
  AfterBlockParameters,
  BeforeBlockParameters,
  ProvableBlockHook
} from "../protocol/ProvableBlockHook";
import { NetworkState } from "../model/network/NetworkState";

export class LastStateRootBlockHook extends ProvableBlockHook<Record<string, never>> {
  public afterBlock({ networkState, state }: AfterBlockParameters): NetworkState {
    return new NetworkState({
      block: networkState.block,
      previous: {
        rootHash: state.stateRoot
      }
    });
  }

  public beforeBlock(blockData: BeforeBlockParameters): NetworkState {
    return blockData.networkState;
  }
}
