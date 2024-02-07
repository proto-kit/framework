import { inject, injectable } from "tsyringe";

import { sequencerModule } from "../../../sequencer/builder/SequencerModule";
import { ComputedBlock } from "../../../storage/model/Block";
import { BlockProducerModule } from "../BlockProducerModule";
import { UnprovenProducerModule } from "../unproven/UnprovenProducerModule";
import { UnprovenBlockQueue } from "../../../storage/repositories/UnprovenBlockStorage";
import { SettlementModule } from "../../../settlement/SettlementModule";
import { UnprovenBlock } from "../unproven/TransactionExecutionService";

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
    @inject("UnprovenBlockQueue")
    unprovenBlockQueue: UnprovenBlockQueue,
    @inject("SettlementModule")
    settlementModule: SettlementModule
  ) {
    super(
      blockProducerModule,
      unprovenProducerModule,
      unprovenBlockQueue,
      settlementModule
    );
  }

  /**
   * Produces both an unproven block and immediately produce a
   * settlement block proof
   */
  public async produceBlock(): Promise<
    [UnprovenBlock | undefined, ComputedBlock | undefined]
  > {
    return [await this.produceUnproven(), await this.produceProven()];
  }

  public async produceProven(): Promise<ComputedBlock | undefined> {
    return await super.produceProven();
  }

  public async produceUnproven(
    enqueueInSettlementQueue: boolean = true
  ): Promise<UnprovenBlock | undefined> {
    return await super.produceUnproven(enqueueInSettlementQueue);
  }
}
