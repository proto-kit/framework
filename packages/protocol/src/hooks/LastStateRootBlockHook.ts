import { ProvableBlockHook } from "../protocol/ProvableBlockHook";
import { NetworkState } from "../model/network/NetworkState";
import { BlockProverState } from "../prover/block/BlockProver";

export class LastStateRootBlockHook extends ProvableBlockHook<
  Record<string, never>
> {
  public async afterBlock(
    networkState: NetworkState,
    state: BlockProverState
  ): Promise<NetworkState> {
    return new NetworkState({
      block: networkState.block,
      previous: {
        rootHash: state.stateRoot,
      },
    });
  }

  public async beforeBlock(
    networkState: NetworkState,
    state: BlockProverState
  ): Promise<NetworkState> {
    return networkState;
  }
}
