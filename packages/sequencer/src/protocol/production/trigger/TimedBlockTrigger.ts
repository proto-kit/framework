import { BlockProducingFunction, BlockTrigger } from "./BlockTrigger";
import { Closeable } from "../../../worker/queue/TaskQueue";
import { injectable, registry } from "tsyringe";
import { SequencerModule } from "../../../sequencer/builder/SequencerModule";
import { FlipOptional } from "@yab/protocol";

export interface BlockTimeConfig {
  blocktime: number;
}

@injectable()
export class TimedBlockTrigger
  extends SequencerModule<BlockTimeConfig>
  implements BlockTrigger, Closeable
{
  private produceBlock: BlockProducingFunction;

  setProduceBlock(produceBlock: BlockProducingFunction): void {
    this.produceBlock = produceBlock;
  }

  interval?: any;

  public async start(): Promise<void> {
    this.interval = setInterval(async () => {
      await this.produceBlock();
    }, this.config.blocktime);
  }

  public async close(): Promise<void> {
    clearInterval(this.interval)
  }

  get defaultConfig(): FlipOptional<BlockTimeConfig> {
    return { };
  }
}