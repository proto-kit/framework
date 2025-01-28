import { inject, injectable } from "tsyringe";
import { injectOptional, log } from "@proto-kit/common";
import gcd from "compute-gcd";

import { Closeable } from "../../../worker/queue/TaskQueue";
import { BatchProducerModule } from "../BatchProducerModule";
import { Mempool } from "../../../mempool/Mempool";
import { BlockQueue } from "../../../storage/repositories/BlockStorage";
import { BlockProducerModule } from "../sequencing/BlockProducerModule";
import { SettlementModule } from "../../../settlement/SettlementModule";
import { SettlementStorage } from "../../../storage/repositories/SettlementStorage";
import { BatchStorage } from "../../../storage/repositories/BatchStorage";

import { BlockEvents, BlockTrigger, BlockTriggerBase } from "./BlockTrigger";

export interface TimedBlockTriggerConfig {
  /**
   * Interval for the tick event to be fired.
   * The time x of any block trigger time is always guaranteed to be
   * tick % x == 0.
   * Value has to be a divisor of gcd(blockInterval, settlementInterval).
   * If it doesn't satisfy this requirement, this config will not be respected
   */
  tick?: number;
  settlementInterval?: number;
  blockInterval: number;
  produceEmptyBlocks?: boolean;
}

export interface TimedBlockTriggerEvent extends BlockEvents {
  tick: [number];
}

@injectable()
export class TimedBlockTrigger
  extends BlockTriggerBase<TimedBlockTriggerConfig, TimedBlockTriggerEvent>
  implements BlockTrigger, Closeable
{
  // There is no real type for interval ids somehow, so any it is

  private interval?: any;

  public constructor(
    @injectOptional("BatchProducerModule")
    batchProducerModule: BatchProducerModule | undefined,
    @inject("BlockProducerModule")
    blockProducerModule: BlockProducerModule,
    @injectOptional("SettlementModule")
    settlementModule: SettlementModule | undefined,
    @inject("BlockQueue")
    blockQueue: BlockQueue,
    @inject("BatchStorage")
    batchStorage: BatchStorage,
    @injectOptional("SettlementStorage")
    settlementStorage: SettlementStorage | undefined,
    @inject("Mempool")
    private readonly mempool: Mempool
  ) {
    super(
      blockProducerModule,
      batchProducerModule,
      settlementModule,
      blockQueue,
      batchStorage,
      settlementStorage
    );
  }

  private getTimerInterval(): number {
    const { settlementInterval, blockInterval, tick } = this.config;

    let timerInterval =
      settlementInterval !== undefined
        ? gcd(settlementInterval, blockInterval)
        : blockInterval;

    const definedTick = tick ?? 1000;
    if (definedTick <= timerInterval) {
      // Check if tick is a divisor of the calculated interval
      const div = timerInterval / definedTick;
      if (Math.floor(div) === div) {
        timerInterval = definedTick;
      }
    }

    return timerInterval;
  }

  public async start(): Promise<void> {
    log.info("Starting timed block trigger");
    const { settlementInterval, blockInterval } = this.config;

    const timerInterval = this.getTimerInterval();

    let totalTime = 0;
    this.interval = setInterval(async () => {
      totalTime += timerInterval;

      this.events.emit("tick", totalTime);

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
          const batch = await this.produceBatch();
          if (batch !== undefined) {
            await this.settle(batch);
          }
        }
      } catch (error) {
        log.error(error);
      }
    }, timerInterval);

    await super.start();
  }

  private async produceUnprovenBlock() {
    const mempoolTxs = await this.mempool.getTxs();
    // Produce a block if either produceEmptyBlocks is true or we have more
    // than 1 tx in mempool
    if (mempoolTxs.length > 0 || (this.config.produceEmptyBlocks ?? true)) {
      await this.produceBlock();
    }
  }

  public async close(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    clearInterval(this.interval);
  }
}
