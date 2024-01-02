import { inject, injectable } from "tsyringe";
import { noop } from "@proto-kit/common";

import { SequencerModule } from "../../../sequencer/builder/SequencerModule";
import { ComputedBlock } from "../../../storage/model/Block";
import { BlockProducerModule } from "../BlockProducerModule";
import { UnprovenProducerModule } from "../unproven/UnprovenProducerModule";
import { UnprovenBlock } from "../../../storage/model/UnprovenBlock";
import { UnprovenBlockQueue } from "../../../storage/repositories/UnprovenBlockStorage";

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
  public async produceBlock(): Promise<[UnprovenBlock | undefined, ComputedBlock | undefined]> {
    return [await this.produceUnproven(), await this.produceProven()];
  }

  public async produceProven(): Promise<ComputedBlock | undefined> {
    const blocks = await this.unprovenBlockQueue.getNewBlocks();
    if (blocks.length > 0) {
      return await this.blockProducerModule.createBlock(blocks);
    }
    return undefined;
  }

  public async produceUnproven(): Promise<UnprovenBlock | undefined> {
    return await this.unprovenProducerModule.tryProduceUnprovenBlock();
  }

  public async start(): Promise<void> {
    noop();
  }
}
