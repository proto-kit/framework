import {
  AfterBlockHookArguments,
  ProvableBlockHook,
} from "../protocol/ProvableBlockHook";
import { NetworkState } from "../model/network/NetworkState";

export class LastStateRootBlockHook extends ProvableBlockHook<
  Record<string, never>
> {
  public async afterBlock(
    networkState: NetworkState,
    { stateRoot }: AfterBlockHookArguments
  ): Promise<NetworkState> {
    return new NetworkState({
      block: networkState.block,
      previous: {
        rootHash: stateRoot,
      },
    });
  }

  public async beforeBlock(networkState: NetworkState): Promise<NetworkState> {
    return networkState;
  }
}
