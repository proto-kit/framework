import {
  EventEmitter,
  EventEmittingComponent,
  NoConfig,
  noop,
  log,
} from "@proto-kit/common";

import { Batch, SettleableBatch } from "../../../storage/model/Batch";
import { BatchProducerModule } from "../BatchProducerModule";
import { BlockProducerModule } from "../sequencing/BlockProducerModule";
import { BlockQueue } from "../../../storage/repositories/BlockStorage";
import { SequencerModule } from "../../../sequencer/builder/SequencerModule";
import { SettlementModule } from "../../../settlement/SettlementModule";
import { Block, BlockWithResult } from "../../../storage/model/Block";
import {
  BridgingModule,
  SettlementTokenConfig,
} from "../../../settlement/BridgingModule";
import { set } from "husky";

/**
 * A BlockTrigger is the primary method to start the production of a block and
 * all associated processes.
 */

export interface BlockTrigger {}

// TODO Move events and storage interactions back to production modules
// BlockTriggers should only be responsible for triggering, nothing else
export type BlockEvents = {
  "block-produced": [Block];
  "block-metadata-produced": [BlockWithResult];
  "batch-produced": [Batch];
  // TODO Settlement
};

export class BlockTriggerBase<
    Config = NoConfig,
    Events extends BlockEvents = BlockEvents,
  >
  extends SequencerModule<Config>
  implements BlockTrigger, EventEmittingComponent<Events>
{
  public readonly events = new EventEmitter<Events>();

  public constructor(
    protected readonly blockProducerModule: BlockProducerModule,
    protected readonly batchProducerModule: BatchProducerModule | undefined,
    protected readonly settlementModule: SettlementModule | undefined,
    protected readonly bridgingModule: BridgingModule | undefined,
    protected readonly blockQueue: BlockQueue
  ) {
    super();
  }

  protected async produceBatch(): Promise<SettleableBatch | undefined> {
    const blocks = await this.blockQueue.getNewBlocks();
    if (blocks.length > 0) {
      const batch = await this.batchProducerModule?.createBatch(blocks);
      if (batch !== undefined) {
        this.events.emit("batch-produced", batch);
      }
      return batch;
    }
    return undefined;
  }

  protected async produceBlockWithResult(): Promise<
    BlockWithResult | undefined
  > {
    const block = await this.blockProducerModule.tryProduceBlock();
    if (block) {
      this.events.emit("block-produced", block);

      const result = await this.blockProducerModule.generateMetadata(block);

      const blockWithMetadata = {
        block,
        result,
      };

      this.events.emit("block-metadata-produced", blockWithMetadata);

      return blockWithMetadata;
    }
    return undefined;
  }

  protected async produceBlock(): Promise<Block | undefined> {
    const blockWithResult = await this.produceBlockWithResult();

    return blockWithResult?.block;
  }

  protected async settle(
    batch: SettleableBatch,
    config: SettlementTokenConfig
    // nonce?: number
  ) {
    if (this.settlementModule === undefined) {
      log.info(
        "SettlementModule not configured, cannot compute settlement, skipping"
      );
      return undefined;
    }
    const settlement = await this.settlementModule.settleBatch(batch);

    const txs = await this.bridgingModule?.sendRollupTransactions(
      [batch],
      config
      // TODO nonce override
    );

    return { settlement, bridgeTransactions: txs };
  }

  public async start(): Promise<void> {
    noop();
  }
}
