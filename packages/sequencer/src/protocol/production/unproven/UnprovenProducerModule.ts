import { inject } from "tsyringe";
import {
  EventEmitter,
  EventEmittingComponent,
  EventsRecord,
  log,
  noop,
  requireTrue,
} from "@proto-kit/common";

import { Mempool } from "../../../mempool/Mempool";
import {
  sequencerModule,
  SequencerModule,
} from "../../../sequencer/builder/SequencerModule";
import { UnprovenBlockQueue } from "../../../storage/repositories/UnprovenBlockStorage";
import { PendingTransaction } from "../../../mempool/PendingTransaction";
import { AsyncMerkleTreeStore } from "../../../state/async/AsyncMerkleTreeStore";
import { AsyncStateService } from "../../../state/async/AsyncStateService";
import {
  UnprovenBlock,
  UnprovenBlockWithMetadata,
} from "../../../storage/model/UnprovenBlock";
import { CachedStateService } from "../../../state/state/CachedStateService";

import { TransactionExecutionService } from "./TransactionExecutionService";
import { MessageStorage } from "../../../storage/repositories/MessageStorage";
import { ACTIONS_EMPTY_HASH } from "@proto-kit/protocol";

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
    @inject("MessageStorage") private readonly messageStorage: MessageStorage,
    @inject("UnprovenStateService")
    private readonly unprovenStateService: AsyncStateService,
    @inject("UnprovenMerkleStore")
    private readonly unprovenMerkleStore: AsyncMerkleTreeStore,
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

  public async tryProduceUnprovenBlock(): Promise<
    UnprovenBlockWithMetadata | undefined
  > {
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

        return {
          block,
          metadata,
        };
      } catch (error: unknown) {
        if (error instanceof Error) {
          throw error;
        } else {
          log.error(error);
        }
      } finally {
        this.productionInProgress = false;
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

    const messages = await this.messageStorage.getMessages(
      parentBlock?.block.toMessagesHash.toString() ??
        ACTIONS_EMPTY_HASH.toString()
    );
    const metadata = parentBlock ?? UnprovenBlockWithMetadata.createEmpty();

    log.debug(
      `Unproven block collected, ${txs.length} txs, ${messages.length} messages`
    );

    return {
      txs: messages.concat(txs),
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

    const cachedStateService = new CachedStateService(
      this.unprovenStateService
    );

    const block = await this.executionService.createUnprovenBlock(
      cachedStateService,
      txs,
      metadata,
      this.allowEmptyBlock()
    );

    await cachedStateService.mergeIntoParent();

    this.productionInProgress = false;

    requireTrue(
      this.mempool.removeTxs(txs.filter((tx) => !tx.isMessage)),
      errors.txRemovalFailed
    );

    return block;
  }

  public async start() {
    noop();
  }
}
