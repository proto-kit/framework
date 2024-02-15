import { NoConfig, noop } from "@proto-kit/common";

import { ComputedBlock } from "../../../storage/model/Block";
import { BlockProducerModule } from "../BlockProducerModule";
import { UnprovenProducerModule } from "../unproven/UnprovenProducerModule";
import {
  HistoricalUnprovenBlockStorage,
  UnprovenBlockQueue,
} from "../../../storage/repositories/UnprovenBlockStorage";
import { SequencerModule } from "../../../sequencer/builder/SequencerModule";
import { SettlementModule } from "../../../settlement/SettlementModule";
import { UnprovenBlock } from "../../../storage/model/UnprovenBlock";
import { container } from "tsyringe";

/**
 * A BlockTrigger is the primary method to start the production of a block and
 * all associated processes.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BlockTrigger {}

export class BlockTriggerBase<Config = NoConfig>
  extends SequencerModule<Config>
  implements BlockTrigger
{
  public constructor(
    protected readonly blockProducerModule: BlockProducerModule,
    protected readonly unprovenProducerModule: UnprovenProducerModule,
    protected readonly unprovenBlockQueue: UnprovenBlockQueue & HistoricalUnprovenBlockStorage,
    protected readonly settlementModule?: SettlementModule
  ) {
    super();
  }

  protected async produceProven(): Promise<ComputedBlock | undefined> {
    const blocks = await this.unprovenBlockQueue.getNewBlocks();
    if (blocks.length > 0) {
      return await this.blockProducerModule.createBlock(blocks);
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
      await this.unprovenBlockQueue.pushMetadata(unprovenBlock.metadata);
    }

    return unprovenBlock?.block;
  }

  protected async settle(batch: ComputedBlock) {
    // const firstBlock =

    // TODO After Persistance PR because we need batch.blocks for that
  }

  public async start(): Promise<void> {
    noop();
  }
}
