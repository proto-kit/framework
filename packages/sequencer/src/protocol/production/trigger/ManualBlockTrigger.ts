import { injectable } from "tsyringe";
import { noop } from "@yab/protocol";

import { SequencerModule } from "../../../sequencer/builder/SequencerModule";

import { BlockProducingFunction, BlockTrigger } from "./BlockTrigger";
import { ComputedBlock } from "../../../storage/model/Block";

@injectable()
export class ManualBlockTrigger
  extends SequencerModule<object>
  implements BlockTrigger
{
  private produceBlockAction: BlockProducingFunction;

  public setProduceBlock(produceBlock: BlockProducingFunction): void {
    this.produceBlockAction = produceBlock;
  }

  public async produceBlock(): Promise<ComputedBlock | undefined> {
    return await this.produceBlockAction();
  }

  public async start(): Promise<void> {
    noop();
  }
}
