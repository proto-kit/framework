import { inject, injectable } from "tsyringe";
import { injectOptional, log } from "@proto-kit/common";
import gcd from "compute-gcd";

import { Closeable } from "../../../worker/queue/TaskQueue";
import { BlockProducerModule } from "../BlockProducerModule";
import { Mempool } from "../../../mempool/Mempool";
import {
  UnprovenBlockQueue,
} from "../../../storage/repositories/UnprovenBlockStorage";
import { UnprovenProducerModule } from "../unproven/UnprovenProducerModule";
import { SettlementModule } from "../../../settlement/SettlementModule";

import { BlockTrigger, BlockTriggerBase } from "./BlockTrigger";
import { SettlementStorage } from "../../../storage/repositories/SettlementStorage";
import { BlockStorage } from "../../../storage/repositories/BlockStorage";

export interface TimedBlockTriggerConfig {
  settlementInterval?: number;
  blockInterval: number;
  produceEmptyBlocks?: boolean;
}

@injectable()
export class TimedBlockTrigger
  extends BlockTriggerBase<TimedBlockTriggerConfig>
  implements BlockTrigger, Closeable
{
  // There is no real type for interval ids somehow, so any it is
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private interval?: any;

  public constructor(
    @inject("BlockProducerModule")
    blockProducerModule: BlockProducerModule,
    @inject("UnprovenProducerModule")
    unprovenProducerModule: UnprovenProducerModule,
    @injectOptional("SettlementModule")
    settlementModule: SettlementModule | undefined,
    @inject("UnprovenBlockQueue")
    unprovenBlockQueue: UnprovenBlockQueue,
    @inject("BlockStorage")
    blockStorage: BlockStorage,
    @injectOptional("SettlementStorage")
    settlementStorage: SettlementStorage | undefined,
    @inject("Mempool")
    private readonly mempool: Mempool
  ) {
    super(
      unprovenProducerModule,
      blockProducerModule,
      settlementModule,
      unprovenBlockQueue,
      blockStorage,
      settlementStorage
    );
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
          const batch = await this.produceProven();
          if (batch !== undefined) {
            await this.settle(batch);
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          log.error(error.message + "\n" + error.stack);
        } else {
          log.error(error);
        }
      }
    }, timerInterval);

    await super.start();
  }

  private async produceUnprovenBlock() {
    const mempoolTxs = await this.mempool.getTxs();
    // Produce a block if either produceEmptyBlocks is true or we have more
    // than 1 tx in mempool
    if (mempoolTxs.length > 0 || (this.config.produceEmptyBlocks ?? true)) {
      await this.produceUnproven(true);
    }
  }

  public async close(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    clearInterval(this.interval);
  }
}
