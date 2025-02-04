import { inject, injectable } from "tsyringe";
import {
  BlockStorage,
  HistoricalBlockStorage,
  HistoricalBatchStorage,
  NetworkStateTransportModule,
  Sequencer,
  SequencerModulesRecord,
  BlockQueue,
  BatchStorage,
} from "@proto-kit/sequencer";
import { NetworkState } from "@proto-kit/protocol";

import { AppChainModule } from "../appChain/AppChainModule";

@injectable()
export class BlockStorageNetworkStateModule
  extends AppChainModule<Record<string, never>>
  implements NetworkStateTransportModule
{
  public constructor(
    @inject("Sequencer")
    private readonly sequencer: Sequencer<SequencerModulesRecord>
  ) {
    super();
  }

  private get unprovenQueue(): BlockQueue {
    return this.sequencer.dependencyContainer.resolve<BlockQueue>("BlockQueue");
  }

  private get unprovenStorage(): BlockStorage & HistoricalBlockStorage {
    return this.sequencer.dependencyContainer.resolve<
      BlockStorage & HistoricalBlockStorage
    >("BlockStorage");
  }

  private get provenStorage(): BatchStorage & HistoricalBatchStorage {
    return this.sequencer.dependencyContainer.resolve<
      BatchStorage & HistoricalBatchStorage
    >("BatchStorage");
  }

  public async getUnprovenNetworkState(): Promise<NetworkState | undefined> {
    const latestBlock = await this.unprovenStorage.getLatestBlock();
    return latestBlock?.block.networkState.during;
  }

  /**
   * Staged network state is the networkstate after the latest unproven block
   * with afterBundle() hooks executed
   */
  public async getStagedNetworkState(): Promise<NetworkState | undefined> {
    const result = await this.unprovenStorage.getLatestBlock();
    return result?.result.afterNetworkState;
  }

  public async getProvenNetworkState(): Promise<NetworkState | undefined> {
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
