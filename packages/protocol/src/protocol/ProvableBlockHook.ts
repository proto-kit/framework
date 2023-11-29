import type { BlockProverState } from "../prover/block/BlockProver";
import { NetworkState } from "../model/network/NetworkState";

import { TransitioningProtocolModule } from "./TransitioningProtocolModule";

export interface BeforeBundleParameters {
  state: BlockProverState;
  networkState: NetworkState;
};

export interface AfterBundleParameters {
  state: BlockProverState;
  networkState: NetworkState;
};

// Purpose is to validate transition from -> to network state
export abstract class ProvableBlockHook<
  Config
> extends TransitioningProtocolModule<Config> {
  public abstract beforeBundle(blockData: BeforeBundleParameters): NetworkState;
  public abstract afterBundle(blockData: AfterBundleParameters): NetworkState;
}