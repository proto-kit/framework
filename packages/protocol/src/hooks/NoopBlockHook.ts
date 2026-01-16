import { NoConfig } from "@proto-kit/common";

import {
  AfterBlockHookArguments,
  BeforeBlockHookArguments,
  ProvableBlockHook,
} from "../protocol/ProvableBlockHook";
import { ProvableNetworkState } from "../model/network/NetworkState";

export class NoopBlockHook extends ProvableBlockHook<NoConfig> {
  public async afterBlock(
    networkState: ProvableNetworkState,
    state: AfterBlockHookArguments
  ): Promise<ProvableNetworkState> {
    return networkState;
  }

  public async beforeBlock(
    networkState: ProvableNetworkState,
    state: BeforeBlockHookArguments
  ): Promise<ProvableNetworkState> {
    return networkState;
  }
}
