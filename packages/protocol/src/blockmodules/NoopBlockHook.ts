import { ProvableBlockHook } from "../protocol/ProvableBlockHook";
import { NetworkState } from "../model/network/NetworkState";
import { BlockProverState } from "../prover/block/BlockProver";
import { NoConfig } from "@proto-kit/common";

export class NoopBlockHook extends ProvableBlockHook<NoConfig> {
  public afterBlock(
    networkState: NetworkState,
    state: BlockProverState
  ): NetworkState {
    return networkState;
  }

  public beforeBlock(
    networkState: NetworkState,
    state: BlockProverState
  ): NetworkState {
    return networkState;
  }
}
