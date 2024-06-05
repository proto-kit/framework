import { NoConfig } from "@proto-kit/common";

import { ProvableBlockHook } from "../protocol/ProvableBlockHook";
import { NetworkState } from "../model/network/NetworkState";
import { BlockProverState } from "../prover/block/BlockProver";

export class NoopBlockHook extends ProvableBlockHook<NoConfig> {
  public async afterBlock(
    networkState: NetworkState,
    state: BlockProverState
  ): Promise<NetworkState> {
    return networkState;
  }

  public async beforeBlock(
    networkState: NetworkState,
    state: BlockProverState
  ): Promise<NetworkState> {
    return networkState;
  }
}
