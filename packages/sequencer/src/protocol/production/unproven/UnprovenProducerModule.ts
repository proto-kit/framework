import { inject } from "tsyringe";
import { BlockHashMerkleTree, NetworkState } from "@proto-kit/protocol";
import {
  EventEmitter,
  EventEmittingComponent,
  EventsRecord,
  log,
  noop,
  requireTrue,
  RollupMerkleTree,
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
  UnprovenBlockWithMetadata,
} from "./TransactionExecutionService";
import { AsyncMerkleTreeStore } from "../../../state/async/AsyncMerkleTreeStore";
import { Field } from "o1js";

const errors = {
  txRemovalFailed: () => new Error("Removal of txs from mempool failed"),
};

interface UnprovenProducerEvents extends EventsRecord {
  unprovenBlockProduced: [UnprovenBlock];
}

export interface BlockConfig {
  allowEmptyBlock?: boolean;
}

@sequencerModule()
export class UnprovenProducerModule
  extends SequencerModule<BlockConfig>
  implements EventEmittingComponent<UnprovenProducerEvents>
{
  private productionInProgress = false;

  public events = new EventEmitter<UnprovenProducerEvents>();

  public constructor(
    @inject("Mempool") private readonly mempool: Mempool,
    @inject("UnprovenStateService")
    private readonly unprovenStateService: CachedStateService,
    @inject("UnprovenMerkleStore")
    private readonly unprovenMerkleStore: CachedMerkleTreeStore,
    @inject("UnprovenBlockQueue")
    private readonly unprovenBlockQueue: UnprovenBlockQueue,
    @inject("BlockTreeStore")
    private readonly blockTreeStore: AsyncMerkleTreeStore,
    private readonly executionService: TransactionExecutionService
  ) {
    super();
  }

  private allowEmptyBlock() {
    return this.config.allowEmptyBlock ?? true;
  }

  public async tryProduceUnprovenBlock(): Promise<UnprovenBlock | undefined> {
    if (!this.productionInProgress) {
      try {
        const block = await this.produceUnprovenBlock();

        if (block === undefined) {
          if (!this.allowEmptyBlock()) {
            log.info("No transactions in mempool, skipping production");
          } else {
            log.error("Something wrong happened, skipping block");
          }
          return undefined;
        }

        log.info(`Produced unproven block (${block.transactions.length} txs)`);
        this.events.emit("unprovenBlockProduced", block);

        // Generate metadata for next block
        // eslint-disable-next-line no-warning-comments
        // TODO: make async of production in the future
        const metadata =
          await this.executionService.generateMetadataForNextBlock(
            block,
            this.unprovenMerkleStore,
            this.blockTreeStore,
            true
          );
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
    metadata: UnprovenBlockWithMetadata;
  }> {
    const { txs } = this.mempool.getTxs();

    const parentBlock = await this.unprovenBlockQueue.getLatestBlock();

    if (parentBlock === undefined) {
      log.debug(
        "No unproven block metadata given, assuming first block, generating genesis metadata"
      );
    }
    const metadata = parentBlock ?? UnprovenBlockWithMetadata.createEmpty();

    return {
      txs,
      metadata,
    };
  }

  private async produceUnprovenBlock(): Promise<UnprovenBlock | undefined> {
    this.productionInProgress = true;

    const { txs, metadata } = await this.collectProductionData();

    // Skip production if no transactions are available for now
    if (txs.length === 0 && !this.allowEmptyBlock()) {
      return undefined;
    }

    const block = await this.executionService.createUnprovenBlock(
      this.unprovenStateService,
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
