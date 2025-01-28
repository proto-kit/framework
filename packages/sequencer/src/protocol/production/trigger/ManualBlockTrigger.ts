import { inject } from "tsyringe";
import { injectOptional } from "@proto-kit/common";

import { sequencerModule } from "../../../sequencer/builder/SequencerModule";
import { SettleableBatch } from "../../../storage/model/Batch";
import { BatchProducerModule } from "../BatchProducerModule";
import { BlockProducerModule } from "../sequencing/BlockProducerModule";
import { Block, BlockWithResult } from "../../../storage/model/Block";
import { BlockQueue } from "../../../storage/repositories/BlockStorage";
import { SettlementModule } from "../../../settlement/SettlementModule";
import { BatchStorage } from "../../../storage/repositories/BatchStorage";
import { SettlementStorage } from "../../../storage/repositories/SettlementStorage";

import { BlockTrigger, BlockTriggerBase } from "./BlockTrigger";

@sequencerModule()
export class ManualBlockTrigger
  extends BlockTriggerBase
  implements BlockTrigger
{
  public constructor(
    @inject("BatchProducerModule")
    batchProducerModule: BatchProducerModule,
    @inject("BlockProducerModule")
    blockProducerModule: BlockProducerModule,
    @injectOptional("SettlementModule")
    settlementModule: SettlementModule | undefined,
    @inject("BlockQueue")
    blockQueue: BlockQueue,
    @inject("BatchStorage")
    batchStorage: BatchStorage,
    @injectOptional("SettlementStorage")
    settlementStorage: SettlementStorage | undefined
  ) {
    super(
      blockProducerModule,
      batchProducerModule,
      settlementModule,

      blockQueue,
      batchStorage,
      settlementStorage
    );
  }

  /**
   * Produces both an unproven block and immediately produce a
   * settlement block proof
   */
  public async produceBlockAndBatch(): Promise<
    [Block | undefined, SettleableBatch | undefined]
  > {
    return [await this.produceBlock(), await this.produceBatch()];
  }

  // These methods expose the internal methods publicly
  public async produceBatch(): Promise<SettleableBatch | undefined> {
    return await super.produceBatch();
  }

  public async settle(batch: SettleableBatch) {
    return await super.settle(batch);
  }

  public async produceBlock(): Promise<Block | undefined> {
    return await super.produceBlock();
  }

  public async produceBlockWithResult(): Promise<BlockWithResult | undefined> {
    return await super.produceBlockWithResult();
  }
}
