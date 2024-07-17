import { inject } from "tsyringe";
import { injectOptional } from "@proto-kit/common";

import { sequencerModule } from "../../../sequencer/builder/SequencerModule";
import { SettleableBatch } from "../../../storage/model/Batch";
import { BatchProducerModule } from "../BatchProducerModule";
import { UnprovenProducerModule } from "../sequencing/UnprovenProducerModule";
import { Block } from "../../../storage/model/Block";
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
    @inject("UnprovenProducerModule")
    unprovenProducerModule: UnprovenProducerModule,
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
      unprovenProducerModule,
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
  public async produceBlock(): Promise<
    [Block | undefined, SettleableBatch | undefined]
  > {
    return [await this.produceUnproven(), await this.produceProven()];
  }

  public async produceProven(): Promise<SettleableBatch | undefined> {
    return await super.produceProven();
  }

  public async settle(batch: SettleableBatch) {
    return await super.settle(batch);
  }

  public async produceUnproven(
    enqueueInSettlementQueue: boolean = true
  ): Promise<Block | undefined> {
    return await super.produceUnproven(enqueueInSettlementQueue);
  }
}
