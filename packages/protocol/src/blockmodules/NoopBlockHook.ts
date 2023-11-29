import {
  AfterBundleParameters,
  BeforeBundleParameters,
  ProvableBlockHook
} from "../protocol/ProvableBlockHook";
import { NetworkState } from "../model/network/NetworkState";

export class NoopBlockHook extends ProvableBlockHook<Record<string, never>>{
  public afterBundle(blockData: AfterBundleParameters): NetworkState {
    return blockData.networkState;
  }

  public beforeBundle(blockData: BeforeBundleParameters): NetworkState {
    return blockData.networkState;
  }
}