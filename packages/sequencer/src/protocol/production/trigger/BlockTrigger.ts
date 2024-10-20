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
import { BatchStorage } from "../../../storage/repositories/BatchStorage";
import { SettlementStorage } from "../../../storage/repositories/SettlementStorage";

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
    protected readonly blockQueue: BlockQueue,
    protected readonly batchQueue: BatchStorage,
    protected readonly settlementStorage: SettlementStorage | undefined
  ) {
    super();
  }

  protected async produceBatch(): Promise<SettleableBatch | undefined> {
    const blocks = await this.blockQueue.getNewBlocks();
    if (blocks.length > 0) {
      const batch = await this.batchProducerModule?.createBatch(blocks);
      if (batch !== undefined) {
        await this.batchQueue.pushBatch(batch);
        this.events.emit("batch-produced", batch);
      }
      return batch;
    }
    return undefined;
  }

  protected async produceBlockWithResult(
    enqueueInSettlementQueue: boolean
  ): Promise<BlockWithResult | undefined> {
    const block = await this.blockProducerModule.tryProduceBlock();

    if (block && enqueueInSettlementQueue) {
      await this.blockQueue.pushBlock(block.block);
      this.events.emit("block-produced", block.block);

      await this.blockQueue.pushResult(block.result);
      this.events.emit("block-metadata-produced", block);
    }

    return block;
  }

  protected async produceBlock(
    enqueueInSettlementQueue: boolean
  ): Promise<Block | undefined> {
    const blockWithResult = await this.produceBlockWithResult(
      enqueueInSettlementQueue
    );

    return blockWithResult?.block;
  }

  protected async settle(batch: SettleableBatch) {
    if (this.settlementModule === undefined) {
      log.info(
        "SettlementModule not configured, cannot compute settlement, skipping"
      );
      return undefined;
    }
    if (this.settlementStorage === undefined) {
      throw new Error(
        "SettlementStorage module not configured, check provided database moduel"
      );
    }
    const settlement = await this.settlementModule.settleBatch(batch);
    await this.settlementStorage.pushSettlement(settlement);
    return settlement;
  }

  public async start(): Promise<void> {
    noop();
  }
}
