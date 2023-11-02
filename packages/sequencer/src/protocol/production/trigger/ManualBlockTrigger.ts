import { inject, injectable } from "tsyringe";
import { noop } from "@proto-kit/common";

import { SequencerModule } from "../../../sequencer/builder/SequencerModule";
import { ComputedBlock } from "../../../storage/model/Block";
import { BlockProducerModule } from "../BlockProducerModule";

import { BlockTrigger } from "./BlockTrigger";
import { UnprovenProducerModule } from "../unproven/UnprovenProducerModule";

@injectable()
export class ManualBlockTrigger
  extends SequencerModule<object>
  implements BlockTrigger
{
  public constructor(
    @inject("BlockProducerModule")
    private readonly blockProducerModule: BlockProducerModule,
    @inject("UnprovenProducerModule")
    private readonly unprovenProducerModule: UnprovenProducerModule
  ) {
    super();
  }

  public async produceBlock(): Promise<ComputedBlock | undefined> {
    const unprovenBlock =
      await this.unprovenProducerModule.tryProduceUnprovenBlock();
    return await this.blockProducerModule.createBlock([unprovenBlock!]);
  }

  // TODO add unproven & proven distinction

  public async start(): Promise<void> {
    noop();
  }
}
