import { inject } from "tsyringe";
import { NetworkState, RollupMerkleTree } from "@proto-kit/protocol";
import {
  EventEmitter,
  EventEmittingComponent,
  EventsRecord,
  log,
  noop,
  requireTrue,
} from "@proto-kit/common";

import { Mempool } from "../../../mempool/Mempool";
import { CachedStateService } from "../../../state/state/CachedStateService";
import {
  sequencerModule,
  SequencerModule,
} from "../../../sequencer/builder/SequencerModule";
import { UnprovenBlockQueue } from "../../../storage/repositories/UnprovenBlockStorage";
import { PendingTransaction } from "../../../mempool/PendingTransaction";
import { CachedMerkleTreeStore } from "../../../state/merkle/CachedMerkleTreeStore";

import {
  TransactionExecutionService,
  UnprovenBlock,
  UnprovenBlockMetadata,
} from "./TransactionExecutionService";
import { AsyncMerkleTreeStore } from "../../../state/async/AsyncMerkleTreeStore";
import { AsyncStateService } from "../../../state/async/AsyncStateService";

const errors = {
  txRemovalFailed: () => new Error("Removal of txs from mempool failed"),
};

interface UnprovenProducerEvents extends EventsRecord {
  unprovenBlockProduced: [UnprovenBlock];
}

@sequencerModule()
export class UnprovenProducerModule
  extends SequencerModule<unknown>
  implements EventEmittingComponent<UnprovenProducerEvents>
{
  private productionInProgress = false;

  public events = new EventEmitter<UnprovenProducerEvents>();

  public constructor(
    @inject("Mempool") private readonly mempool: Mempool,
    @inject("UnprovenStateService")
    private readonly unprovenStateService: AsyncStateService,
    @inject("UnprovenMerkleStore")
    private readonly unprovenMerkleStore: AsyncMerkleTreeStore,
    @inject("UnprovenBlockQueue")
    private readonly unprovenBlockQueue: UnprovenBlockQueue,
    private readonly executionService: TransactionExecutionService
  ) {
    super();
  }

  private createEmptyMetadata(): UnprovenBlockMetadata {
    return {
      resultingNetworkState: NetworkState.empty(),
      resultingStateRoot: RollupMerkleTree.EMPTY_ROOT,
    };
  }

  public async tryProduceUnprovenBlock(): Promise<UnprovenBlock | undefined> {
    if (!this.productionInProgress) {
      try {
        const block = await this.produceUnprovenBlock();

        if (block === undefined) {
          log.info("No transactions in mempool, skipping production");
          return undefined;
        }

        log.info(`Produced unproven block (${block.transactions.length} txs)`);
        this.events.emit("unprovenBlockProduced", [block]);

        // Generate metadata for next block
        // eslint-disable-next-line no-warning-comments
        // TODO: make async of production in the future
        const metadata = await this.executionService.generateMetadataForNextBlock(block, this.unprovenMerkleStore, true)
        await this.unprovenBlockQueue.pushMetadata(metadata);

        return block;
      } catch (error: unknown) {
        if (error instanceof Error) {
          this.productionInProgress = false;
          throw error;
        } else {
          log.error(error);
        }
      }
    }
    return undefined;
  }

  private async collectProductionData(): Promise<{
    txs: PendingTransaction[];
    metadata: UnprovenBlockMetadata;
  }> {
    const { txs } = this.mempool.getTxs();

    const latestMetadata = await this.unprovenBlockQueue.getNewestMetadata();

    if (latestMetadata === undefined) {
      log.debug(
        "No unproven block metadata given, assuming first block, generating genesis metadata"
      );
    }
    const metadata = latestMetadata ?? this.createEmptyMetadata();

    return {
      txs,
      metadata,
    };
  }

  private async produceUnprovenBlock(): Promise<UnprovenBlock | undefined> {
    this.productionInProgress = true;

    const { txs, metadata } = await this.collectProductionData();

    // Skip production if no transactions are available for now
    if (txs.length === 0) {
      return undefined;
    }

    const stateService = new CachedStateService(this.unprovenStateService);

    const block = await this.executionService.createUnprovenBlock(
      stateService,
      txs,
      metadata
    );

    this.productionInProgress = false;

    requireTrue(this.mempool.removeTxs(txs), errors.txRemovalFailed);

    return block;
  }

  public async start() {
    noop();
  }
}
