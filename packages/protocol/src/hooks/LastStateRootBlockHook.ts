import {
  AfterBlockHookArguments,
  ProvableBlockHook,
} from "../protocol/ProvableBlockHook";
import { ProvableNetworkState } from "../model/network/NetworkState";

export class LastStateRootBlockHook extends ProvableBlockHook<
  Record<string, never>
> {
  public async afterBlock(
    networkState: ProvableNetworkState,
    { stateRoot }: AfterBlockHookArguments
  ): Promise<ProvableNetworkState> {
    return new ProvableNetworkState({
      block: networkState.block,
      previous: {
        rootHash: stateRoot,
      },
    });
  }

  public async beforeBlock(
    networkState: ProvableNetworkState
  ): Promise<ProvableNetworkState> {
    return networkState;
  }
}
