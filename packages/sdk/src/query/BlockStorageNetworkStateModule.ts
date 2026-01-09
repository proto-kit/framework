import { inject, injectable } from "tsyringe";
import {
  BlockStorage,
  NetworkStateTransportModule,
  BlockQueue,
  BatchStorage,
  AppChainModule,
} from "@proto-kit/sequencer";
import { NetworkState, NetworkStateJson } from "@proto-kit/protocol";
import { ModuleContainerLike } from "@proto-kit/common";

@injectable()
export class BlockStorageNetworkStateModule
  extends AppChainModule<Record<string, never>>
  implements NetworkStateTransportModule
{
  public constructor(
    @inject("Sequencer")
    private readonly sequencer: ModuleContainerLike
  ) {
    super();
  }

  private get unprovenQueue(): BlockQueue {
    return this.sequencer.dependencyContainer.resolve<BlockQueue>("BlockQueue");
  }

  private get unprovenStorage(): BlockStorage {
    return this.sequencer.dependencyContainer.resolve<BlockStorage>(
      "BlockStorage"
    );
  }

  private get provenStorage(): BatchStorage {
    return this.sequencer.dependencyContainer.resolve<BatchStorage>(
      "BatchStorage"
    );
  }

  public async getUnprovenNetworkState(): Promise<NetworkStateJson | undefined> {
    const latestBlock = await this.unprovenStorage.getLatestBlock();
    return latestBlock?.block.networkState.during;
  }

  /**
   * Staged network state is the networkstate after the latest unproven block
   * with afterBundle() hooks executed
   */
  public async getStagedNetworkState(): Promise<NetworkStateJson | undefined> {
    const result = await this.unprovenStorage.getLatestBlock();
    return result?.result.afterNetworkState 
          ? NetworkState.toJSON(result.result.afterNetworkState) 
          : undefined;
  }

  public async getProvenNetworkState(): Promise<NetworkStateJson | undefined> {
    const batch = await this.provenStorage.getLatestBatch();

    if (batch !== undefined) {
      const lastBlock = batch.blockHashes.at(-1);
      if (lastBlock === undefined) {
        throw new Error(
          "Batches shouldn't be able to generate proofs without bundles"
        );
      }

      const block = await this.unprovenStorage.getBlock(lastBlock);

      if (block === undefined) {
        throw new Error(
          `Highest block of latest batch not found in blockStorage (hash ${lastBlock})`
        );
      }
      return block.networkState.during; // TODO Probably metadata.after?
    }
    // TODO Replace by NetworkState.empty() across the whole application
    return undefined;
  }
}
