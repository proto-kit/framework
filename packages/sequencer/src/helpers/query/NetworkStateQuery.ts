import { injectable } from "tsyringe";
import { NetworkState } from "@proto-kit/protocol";
import { UInt64 } from "o1js";

import { BlockStorage } from "../../storage/repositories/BlockStorage";

@injectable()
export class NetworkStateQuery {
  public constructor(private readonly blockService: BlockStorage) {}

  public get currentNetworkState(): Promise<NetworkState> {
    return this.getCurrentNetworkState();
  }

  private async getCurrentNetworkState(): Promise<NetworkState> {
    const height = await this.blockService.getCurrentBlockHeight();
    return new NetworkState({
      block: {
        height: UInt64.from(height),
      },
    });
  }
}
