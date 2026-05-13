import { inject } from "tsyringe";

import { sequencerModule } from "../../../sequencer/builder/SequencerModule";
import { SettleableBatch } from "../../../storage/model/Batch";
import { BatchProducerModule } from "../BatchProducerModule";
import { BlockProducerModule } from "../sequencing/BlockProducerModule";
import { Block, BlockWithResult } from "../../../storage/model/Block";
import { BlockQueue } from "../../../storage/repositories/BlockStorage";
import { SettlementModule } from "../../../settlement/SettlementModule";
import {
  BridgingModule,
  SettlementTokenConfig,
} from "../../../settlement/BridgingModule";

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
    @inject("SettlementModule", { isOptional: true })
    settlementModule: SettlementModule | undefined,
    @inject("BridgingModule", { isOptional: true })
    bridgingModule: BridgingModule | undefined,
    @inject("BlockQueue")
    blockQueue: BlockQueue
  ) {
    super(
      blockProducerModule,
      batchProducerModule,
      settlementModule,
      bridgingModule,
      blockQueue
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

  public async settle(
    batches: SettleableBatch | SettleableBatch[],
    config: SettlementTokenConfig
  ) {
    let batchArray: SettleableBatch[];
    if (Array.isArray(batches)) {
      batchArray = batches;
    } else {
      batchArray = [batches];
    }
    return await super.settle(batchArray, config);
  }

  public async produceBlock(): Promise<Block | undefined> {
    return await super.produceBlock();
  }

  public async produceBlockWithResult(): Promise<BlockWithResult | undefined> {
    return await super.produceBlockWithResult();
  }
}
