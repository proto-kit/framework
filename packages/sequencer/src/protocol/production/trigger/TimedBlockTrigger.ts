import { inject, injectable } from "tsyringe";

import { Closeable } from "../../../worker/queue/TaskQueue";
import { SequencerModule } from "../../../sequencer/builder/SequencerModule";
import { BlockProducerModule } from "../BlockProducerModule";
import { Mempool } from "../../../mempool/Mempool";

import { BlockTrigger } from "./BlockTrigger";

export interface BlockTimeConfig {
  blocktime: number;
}

@injectable()
export class TimedBlockTrigger
  extends SequencerModule<BlockTimeConfig>
  implements BlockTrigger, Closeable
{
  // There is no real type for interval ids somehow, so any it is
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private interval?: any;

  public constructor(
    @inject("BlockProducerModule")
    private readonly blockProducerModule: BlockProducerModule,
    @inject("Mempool")
    private readonly mempool: Mempool
  ) {
    super();
  }

  public async start(): Promise<void> {
    this.interval = setInterval(() => {
      if (this.mempool.getTxs().txs.length > 0) {
        void this.blockProducerModule.createBlock();
      }
    }, this.config.blocktime);
  }

  public async close(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    clearInterval(this.interval);
  }
}
