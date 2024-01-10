import { ProvableBlockHook } from "../protocol/ProvableBlockHook";
import { NetworkState } from "../model/network/NetworkState";
import { BlockProverState } from "../prover/block/BlockProver";

export class NoopBlockHook extends ProvableBlockHook<Record<string, never>> {
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
