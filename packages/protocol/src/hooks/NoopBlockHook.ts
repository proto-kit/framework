import {
  AfterBlockParameters,
  BeforeBlockParameters,
  ProvableBlockHook
} from "../protocol/ProvableBlockHook";
import { NetworkState } from "../model/network/NetworkState";

export class NoopBlockHook extends ProvableBlockHook<Record<string, never>>{
  public afterBlock(blockData: AfterBlockParameters): NetworkState {
    return blockData.networkState;
  }

  public beforeBlock(blockData: BeforeBlockParameters): NetworkState {
    return blockData.networkState;
  }
}