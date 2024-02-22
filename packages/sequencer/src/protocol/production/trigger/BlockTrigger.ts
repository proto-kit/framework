import {
  EventEmitter,
  EventEmittingComponent,
  EventsRecord,
  NoConfig,
  noop,
} from "@proto-kit/common";

import { ComputedBlock } from "../../../storage/model/Block";
import { BlockProducerModule } from "../BlockProducerModule";
import { UnprovenProducerModule } from "../unproven/UnprovenProducerModule";
import { UnprovenBlockQueue } from "../../../storage/repositories/UnprovenBlockStorage";
import { SequencerModule } from "../../../sequencer/builder/SequencerModule";
import { SettlementModule } from "../../../settlement/SettlementModule";
import {
  UnprovenBlock,
  UnprovenBlockWithMetadata,
} from "../../../storage/model/UnprovenBlock";

/**
 * A BlockTrigger is the primary method to start the production of a block and
 * all associated processes.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BlockTrigger {}

export interface BlockEvents extends EventsRecord {
  "block-produced": [UnprovenBlock];
  "block-metadata-produced": [UnprovenBlockWithMetadata];
  "batch-produced": [ComputedBlock];
  // TODO Settlement
}

export class BlockTriggerBase<Config = NoConfig, Events extends BlockEvents = BlockEvents>
  extends SequencerModule<Config>
  implements BlockTrigger, EventEmittingComponent<Events>
{
  public readonly events = new EventEmitter<Events>();

  public constructor(
    protected readonly blockProducerModule: BlockProducerModule,
    protected readonly unprovenProducerModule: UnprovenProducerModule,
    protected readonly unprovenBlockQueue: UnprovenBlockQueue,
    protected readonly settlementModule?: SettlementModule
  ) {
    super();
  }

  protected async produceProven(): Promise<ComputedBlock | undefined> {
    const blocks = await this.unprovenBlockQueue.getNewBlocks();
    if (blocks.length > 0) {
      const block = await this.blockProducerModule.createBlock(blocks);
      if (block !== undefined) {
        this.events.emit("batch-produced", block);
      }
      return block;
    }
    return undefined;
  }

  protected async produceUnproven(
    enqueueInSettlementQueue: boolean
  ): Promise<UnprovenBlock | undefined> {
    const unprovenBlock =
      await this.unprovenProducerModule.tryProduceUnprovenBlock();

    if (unprovenBlock && enqueueInSettlementQueue) {
      await this.unprovenBlockQueue.pushBlock(unprovenBlock.block);
      this.events.emit("block-produced", unprovenBlock.block);

      await this.unprovenBlockQueue.pushMetadata(unprovenBlock.metadata);
      this.events.emit("block-metadata-produced", unprovenBlock);
    }

    return unprovenBlock?.block;
  }

  protected async settle(batch: ComputedBlock) {
    // TODO After Persistance PR because we need batch.blocks for that
  }

  public async start(): Promise<void> {
    noop();
  }
}
