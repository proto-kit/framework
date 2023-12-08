import type { BlockProverState } from "../prover/block/BlockProver";
import { NetworkState } from "../model/network/NetworkState";

import { TransitioningProtocolModule } from "./TransitioningProtocolModule";

export interface BeforeBlockParameters {
  state: BlockProverState;
  networkState: NetworkState;
}

export interface AfterBlockParameters {
  state: BlockProverState;
  networkState: NetworkState;
}

// Purpose is to validate transition from -> to network state
export abstract class ProvableBlockHook<
  Config
> extends TransitioningProtocolModule<Config> {
  public abstract beforeBlock(blockData: BeforeBlockParameters): NetworkState;
  public abstract afterBlock(blockData: AfterBlockParameters): NetworkState;
}
