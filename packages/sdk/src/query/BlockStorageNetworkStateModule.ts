import { inject, injectable } from "tsyringe";
import {
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

  private get unprovenStorage(): UnprovenBlockStorage {
    return this.sequencer.dependencyContainer.resolve<UnprovenBlockStorage>(
      "UnprovenBlockStorage"
    );
  }

  public async getUnprovenNetworkState() {
    const latestBlock = await this.unprovenStorage.getLatestBlock();
    return latestBlock?.networkState;
  }

  /**
   * Staged network state is the networkstate after the latest unproven block
   * with afterBundle() hooks executed
   */
  public async getStagedNetworkState() {
    const metadata = await this.unprovenQueue.getNewestMetadata();
    return metadata?.resultingNetworkState;
  }

  public async getProvenNetworkState() {
    // We currently do not carry networkstate data with proven blocks
    return NetworkState.empty();
  }
}
