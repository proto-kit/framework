import { inject, injectable } from "tsyringe";
import { log } from "@proto-kit/common";
import gcd from "compute-gcd";

import { Closeable } from "../../../worker/queue/TaskQueue";
import { SequencerModule } from "../../../sequencer/builder/SequencerModule";
import { BlockProducerModule } from "../BlockProducerModule";
import { Mempool } from "../../../mempool/Mempool";
import { UnprovenBlockQueue } from "../../../storage/repositories/UnprovenBlockStorage";
import { UnprovenProducerModule } from "../unproven/UnprovenProducerModule";

import { BlockTrigger } from "./BlockTrigger";

export interface TimedBlockTriggerConfig {
  settlementInterval?: number;
  blockInterval: number;
  produceEmptyBlocks?: boolean;
}

@injectable()
export class TimedBlockTrigger
  extends SequencerModule<TimedBlockTriggerConfig>
  implements BlockTrigger, Closeable
{
  // There is no real type for interval ids somehow, so any it is
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private interval?: any;

  public constructor(
    @inject("BlockProducerModule")
    private readonly blockProducerModule: BlockProducerModule,
    @inject("UnprovenProducerModule")
    private readonly unprovenProducerModule: UnprovenProducerModule,
    @inject("UnprovenBlockQueue")
    private readonly unprovenBlockQueue: UnprovenBlockQueue,
    @inject("Mempool")
    private readonly mempool: Mempool
  ) {
    super();
  }

  public async start(): Promise<void> {
    const { settlementInterval, blockInterval } = this.config;

    const timerInterval =
      settlementInterval !== undefined
        ? gcd(settlementInterval, blockInterval)
        : blockInterval;

    let totalTime = 0;
    this.interval = setInterval(async () => {
      totalTime += timerInterval;

      try {
        // Trigger unproven blocks
        if (totalTime % blockInterval === 0) {
          await this.produceUnprovenBlock();
        }

        // Trigger proven (settlement) blocks
        // Only produce settlements if a time has been set
        // otherwise treat as unproven-only
        if (
          settlementInterval !== undefined &&
          totalTime % settlementInterval === 0
        ) {
          await this.produceBlock();
        }
      } catch (error) {
        log.error(error);
      }
    }, timerInterval);
  }

  private async produceUnprovenBlock() {
    // Produce a block if either produceEmptyBlocks is true or we have more
    // than 1 tx in mempool
    if (
      this.mempool.getTxs().txs.length > 0 ||
      (this.config.produceEmptyBlocks ?? true)
    ) {
      const block = await this.unprovenProducerModule.tryProduceUnprovenBlock();
      if (block !== undefined) {
        await this.unprovenBlockQueue.pushBlock(block);
      }
    }
  }

  private async produceBlock() {
    const unprovenBlocks = await this.unprovenBlockQueue.popNewBlocks(true);
    if (unprovenBlocks.length > 0) {
      void this.blockProducerModule.createBlock(unprovenBlocks);
    }
  }

  public async close(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    clearInterval(this.interval);
  }
}
