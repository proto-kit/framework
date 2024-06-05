import type { BlockProverState } from "../prover/block/BlockProver";
import { NetworkState } from "../model/network/NetworkState";

import { TransitioningProtocolModule } from "./TransitioningProtocolModule";

// Purpose is to build transition from -> to network state
export abstract class ProvableBlockHook<
  Config,
> extends TransitioningProtocolModule<Config> {
  public abstract beforeBlock(
    networkState: NetworkState,
    state: BlockProverState
  ): Promise<NetworkState>;

  public abstract afterBlock(
    networkState: NetworkState,
    state: BlockProverState
  ): Promise<NetworkState>;
}
