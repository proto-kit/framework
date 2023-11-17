import { injectable } from "tsyringe";
import { NetworkState } from "@proto-kit/protocol";
import { Field, UInt64 } from "o1js";

import {
  BlockStorage,
  HistoricalBlockStorage,
} from "../../storage/repositories/BlockStorage";

@injectable()
export class NetworkStateQuery {
  public constructor(
    private readonly blockService: BlockStorage & HistoricalBlockStorage
  ) {}

  public get currentNetworkState(): Promise<NetworkState> {
    return this.getCurrentNetworkState();
  }

  private async getCurrentNetworkState(): Promise<NetworkState> {
    const height = await this.blockService.getCurrentBlockHeight();
    const previous = await this.blockService.getBlockAt(height - 1);
    return new NetworkState({
      block: {
        height: UInt64.from(height),
      },

      previous: {
        rootHash: previous?.proof.publicOutput.stateRoot ?? Field(0),
      },
    });
  }
}
