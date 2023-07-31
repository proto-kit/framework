import { injectable } from "tsyringe";

import { Closeable } from "../../../worker/queue/TaskQueue";
import { SequencerModule } from "../../../sequencer/builder/SequencerModule";

import { BlockProducingFunction, BlockTrigger } from "./BlockTrigger";

export interface BlockTimeConfig {
  blocktime: number;
}

@injectable()
export class TimedBlockTrigger
  extends SequencerModule<BlockTimeConfig>
  implements BlockTrigger, Closeable
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private interval?: any;

  private produceBlock: BlockProducingFunction = async () => undefined;

  // There is no real type for interval ids somehow, so any it is

  public setProduceBlock(produceBlock: BlockProducingFunction): void {
    this.produceBlock = produceBlock;
  }

  public async start(): Promise<void> {
    this.interval = setInterval(() => {
      void this.produceBlock();
    }, this.config.blocktime);
  }

  public async close(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    clearInterval(this.interval);
  }
}
