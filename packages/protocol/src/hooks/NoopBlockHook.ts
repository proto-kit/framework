import { NoConfig } from "@proto-kit/common";

import {
  AfterBlockHookArguments,
  BeforeBlockHookArguments,
  ProvableBlockHook,
} from "../protocol/ProvableBlockHook";
import { NetworkState } from "../model/network/NetworkState";

export class NoopBlockHook extends ProvableBlockHook<NoConfig> {
  public async afterBlock(
    networkState: NetworkState,
    state: AfterBlockHookArguments
  ): Promise<NetworkState> {
    return networkState;
  }

  public async beforeBlock(
    networkState: NetworkState,
    state: BeforeBlockHookArguments
  ): Promise<NetworkState> {
    return networkState;
  }
}
