import { NoConfig, noop } from "@proto-kit/common";

import { SettleableBatch } from "../../../storage/model/Block";
import { BlockProducerModule } from "../BlockProducerModule";
import { UnprovenProducerModule } from "../unproven/UnprovenProducerModule";
import {
  UnprovenBlockQueue,
} from "../../../storage/repositories/UnprovenBlockStorage";
import { SequencerModule } from "../../../sequencer/builder/SequencerModule";
import { SettlementModule } from "../../../settlement/SettlementModule";
import { UnprovenBlock } from "../../../storage/model/UnprovenBlock";
import { BlockStorage } from "../../../storage/repositories/BlockStorage";
import { SettlementStorage } from "../../../storage/repositories/SettlementStorage";

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
    protected readonly unprovenProducerModule: UnprovenProducerModule,
    protected readonly blockProducerModule: BlockProducerModule,
    protected readonly settlementModule: SettlementModule | undefined,
    protected readonly unprovenBlockQueue: UnprovenBlockQueue,
    protected readonly batchQueue: BlockStorage,
    protected readonly settlementStorage: SettlementStorage | undefined
  ) {
    super();
  }

  protected async produceProven(): Promise<SettleableBatch | undefined> {
    const blocks = await this.unprovenBlockQueue.getNewBlocks();
    if (blocks.length > 0) {
      const batch = await this.blockProducerModule.createBlock(blocks);
      if (batch !== undefined) {
        await this.batchQueue.pushBlock(batch);
      }
      return batch;
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

  protected async settle(batch: SettleableBatch) {
    if (this.settlementModule === undefined) {
      throw new Error(
        "SettlementModule not configured, cannot compute settlement"
      );
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
