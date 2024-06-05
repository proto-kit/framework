import { inject } from "tsyringe";
import { injectOptional } from "@proto-kit/common";

import { sequencerModule } from "../../../sequencer/builder/SequencerModule";
import { SettleableBatch } from "../../../storage/model/Block";
import { BlockProducerModule } from "../BlockProducerModule";
import { UnprovenProducerModule } from "../unproven/UnprovenProducerModule";
import { UnprovenBlock } from "../../../storage/model/UnprovenBlock";
import { UnprovenBlockQueue } from "../../../storage/repositories/UnprovenBlockStorage";
import { SettlementModule } from "../../../settlement/SettlementModule";
import { BlockStorage } from "../../../storage/repositories/BlockStorage";
import { SettlementStorage } from "../../../storage/repositories/SettlementStorage";

import { BlockTrigger, BlockTriggerBase } from "./BlockTrigger";

@sequencerModule()
export class ManualBlockTrigger
  extends BlockTriggerBase
  implements BlockTrigger
{
  public constructor(
    @inject("BlockProducerModule")
    blockProducerModule: BlockProducerModule,
    @inject("UnprovenProducerModule")
    unprovenProducerModule: UnprovenProducerModule,
    @injectOptional("SettlementModule")
    settlementModule: SettlementModule | undefined,
    @inject("UnprovenBlockQueue")
    unprovenBlockQueue: UnprovenBlockQueue,
    @inject("BlockStorage")
    blockStorage: BlockStorage,
    @injectOptional("SettlementStorage")
    settlementStorage: SettlementStorage | undefined
  ) {
    super(
      unprovenProducerModule,
      blockProducerModule,
      settlementModule,

      unprovenBlockQueue,
      blockStorage,
      settlementStorage
    );
  }

  /**
   * Produces both an unproven block and immediately produce a
   * settlement block proof
   */
  public async produceBlock(): Promise<
    [UnprovenBlock | undefined, SettleableBatch | undefined]
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
  ): Promise<UnprovenBlock | undefined> {
    return await super.produceUnproven(enqueueInSettlementQueue);
  }
}
