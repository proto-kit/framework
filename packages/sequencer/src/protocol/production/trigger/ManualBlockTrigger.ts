import { inject, injectable } from "tsyringe";
import { noop } from "@yab/protocol";

import { SequencerModule } from "../../../sequencer/builder/SequencerModule";
import { ComputedBlock } from "../../../storage/model/Block";
import { BlockProducerModule } from "../BlockProducerModule";

import { BlockTrigger } from "./BlockTrigger";

@injectable()
export class ManualBlockTrigger
  extends SequencerModule<object>
  implements BlockTrigger
{
  public constructor(
    @inject("BlockProducerModule")
    private readonly blockProducerModule: BlockProducerModule
  ) {
    super();
  }

  public async produceBlock(): Promise<ComputedBlock | undefined> {
    return await this.blockProducerModule.createBlock();
  }

  public async start(): Promise<void> {
    noop();
  }
}
