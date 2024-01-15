import { inject, injectable } from "tsyringe";
import {
  BlockStorage,
  HistoricalBlockStorage,
  HistoricalUnprovenBlockStorage,
  NetworkStateTransportModule,
  Sequencer,
  SequencerModulesRecord,
  UnprovenBlockQueue,
  UnprovenBlockStorage,
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

  private get unprovenQueue(): UnprovenBlockQueue {
    return this.sequencer.dependencyContainer.resolve<UnprovenBlockQueue>(
      "UnprovenBlockQueue"
    );
  }

  private get unprovenStorage(): UnprovenBlockStorage &
    HistoricalUnprovenBlockStorage {
    return this.sequencer.dependencyContainer.resolve<
      UnprovenBlockStorage & HistoricalUnprovenBlockStorage
    >("UnprovenBlockStorage");
  }

  private get provenStorage(): BlockStorage & HistoricalBlockStorage {
    return this.sequencer.dependencyContainer.resolve<
      BlockStorage & HistoricalBlockStorage
    >("BlockStorage");
  }

  public async getUnprovenNetworkState(): Promise<NetworkState> {
    const latestBlock = await this.unprovenStorage.getLatestBlock();
    return latestBlock?.block.networkState.during ?? NetworkState.empty();
  }

  /**
   * Staged network state is the networkstate after the latest unproven block
   * with afterBundle() hooks executed
   */
  public async getStagedNetworkState(): Promise<NetworkState> {
    const metadata = await this.unprovenQueue.getLatestBlock();
    return metadata?.metadata.afterNetworkState ?? NetworkState.empty();
  }

  public async getProvenNetworkState(): Promise<NetworkState> {
    const batchHeight = await this.provenStorage.getCurrentBlockHeight();
    const batch = await this.provenStorage.getBlockAt(batchHeight - 1);

    if (batch !== undefined) {
      const lastBlock = batch.bundles.at(-1);
      if (lastBlock === undefined) {
        throw new Error(
          "Batches shouldn't be able to generate proofs without bundles"
        );
      }

      const block = await this.unprovenStorage.getBlock(lastBlock);

      if (block !== undefined) {
        return block.networkState.during; // TODO Probably metadata.after?
      }
    }
    // We currently do not carry networkstate data with proven blocks
    return NetworkState.empty();
  }
}
