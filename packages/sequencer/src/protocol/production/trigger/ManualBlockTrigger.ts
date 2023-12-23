import { inject, injectable } from "tsyringe";
import { noop } from "@proto-kit/common";

import { SequencerModule } from "../../../sequencer/builder/SequencerModule";
import { ComputedBlock } from "../../../storage/model/Block";
import { BlockProducerModule } from "../BlockProducerModule";
import { UnprovenProducerModule } from "../unproven/UnprovenProducerModule";
import { UnprovenBlockQueue } from "../../../storage/repositories/UnprovenBlockStorage";
import { UnprovenBlock } from "../unproven/TransactionExecutionService";

import { BlockTrigger } from "./BlockTrigger";

@injectable()
export class ManualBlockTrigger
  extends SequencerModule
  implements BlockTrigger
{
  public constructor(
    @inject("BlockProducerModule")
    private readonly blockProducerModule: BlockProducerModule,
    @inject("UnprovenProducerModule")
    private readonly unprovenProducerModule: UnprovenProducerModule,
    @inject("UnprovenBlockQueue")
    private readonly unprovenBlockQueue: UnprovenBlockQueue
  ) {
    super();
  }

  /**
   * Produces both an unproven block and immediately produce a
   * settlement block proof
   */
  public async produceBlock(): Promise<ComputedBlock | undefined> {
    await this.produceUnproven();
    return await this.produceProven();
  }

  public async produceProven(): Promise<ComputedBlock | undefined> {
    const blocks = await this.unprovenBlockQueue.getNewBlocks();
    if (blocks.length > 0) {
      return await this.blockProducerModule.createBlock(blocks);
    }
    return undefined;
  }

  public async produceUnproven(
    enqueueInSettlementQueue = true
  ): Promise<UnprovenBlock | undefined> {
    const unprovenBlock =
      await this.unprovenProducerModule.tryProduceUnprovenBlock();

    if (unprovenBlock && enqueueInSettlementQueue) {
      await this.unprovenBlockQueue.pushBlock(unprovenBlock);
    }

    return unprovenBlock;
  }

  public async start(): Promise<void> {
    noop();
  }
}
