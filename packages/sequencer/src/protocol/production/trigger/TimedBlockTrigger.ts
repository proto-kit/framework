import { inject, injectable } from "tsyringe";
import { dependencyFactory, log, mapSequential } from "@proto-kit/common";

import { closeable, Closeable } from "../../../sequencer/builder/Closeable";
import { BatchProducerModule } from "../BatchProducerModule";
import { Mempool } from "../../../mempool/Mempool";
import { BlockQueue } from "../../../storage/repositories/BlockStorage";
import { BlockProducerModule } from "../sequencing/BlockProducerModule";
import { SettlementModule } from "../../../settlement/SettlementModule";
import {
  BridgingModule,
  SettlementTokenConfig,
} from "../../../settlement/BridgingModule";
import { ensureNotBusy } from "../../../helpers/BusyGuard";
import { SequencerStartupModule } from "../../../sequencer/SequencerStartupModule";
import { BlockProductionInstrumentation } from "../../../metrics/BlockProductionInstrumentation";
import { SequencerCoreModule } from "../../../sequencer/SequencerCoreModule";
import { SettleableBatch } from "../../../storage/model/Batch";

import { BlockTriggerBase } from "./BlockTrigger";

export interface TimedBlockTriggerConfig {
  settlementInterval?: number;
  blockInterval: number;
  produceEmptyBlocks?: boolean;

  settlementTokenConfig: SettlementTokenConfig;
}

@injectable()
@closeable()
@dependencyFactory()
export class TimedBlockTrigger
  extends BlockTriggerBase<TimedBlockTriggerConfig>
  implements Closeable
{
  private intervals: NodeJS.Timeout[] = [];

  private isFirstSettlement = true;

  public constructor(
    @inject("BatchProducerModule", { isOptional: true })
    batchProducerModule: BatchProducerModule | undefined,
    @inject("BlockProducerModule")
    blockProducerModule: BlockProducerModule,
    @inject("SettlementModule", { isOptional: true })
    settlementModule: SettlementModule | undefined,
    @inject("BridgingModule", { isOptional: true })
    bridgingModule: BridgingModule | undefined,
    @inject("BlockQueue")
    blockQueue: BlockQueue,
    @inject("Mempool")
    private readonly mempool: Mempool,
    // Only for start order, we need to make sure startup is finished before
    // starting the block production
    @inject("SequencerStartupModule")
    private readonly startupModule: SequencerStartupModule,
    // TODO Fix the necessity for this - by having @startable() and starting based on that
    @inject("SequencerCoreModule", { isOptional: true })
    private readonly sequencerCoreModule: SequencerCoreModule | undefined
  ) {
    super(
      blockProducerModule,
      batchProducerModule,
      settlementModule,
      bridgingModule,
      blockQueue
    );
  }

  public static dependencies() {
    return {
      BlockProductionInstrumentation: {
        useClass: BlockProductionInstrumentation,
      },
    };
  }

  public async start(): Promise<void> {
    log.info("Starting timed block trigger");
    const { settlementInterval, blockInterval } = this.config;

    if (
      settlementInterval !== undefined &&
      this.batchProducerModule === undefined
    ) {
      log.warn(
        "Settlement interval is configured, but no BatchProducerModule is - Batch production and settlement will not work, consider adding the missing module to your sequencer config"
      );
    }

    const blockIntervalId = setInterval(async () => {
      // Trigger unproven blocks
      await this.produceUnprovenBlock();
    }, blockInterval);
    this.intervals.push(blockIntervalId);

    if (settlementInterval !== undefined) {
      const settlementIntervalId = setInterval(async () => {
        // Trigger settlement
        await this.tryProduceSettlement();
      }, settlementInterval);
      this.intervals.push(settlementIntervalId);
    }

    await super.start();
  }

  // This is technically not necessary since produceBlock checks business down the line
  // but we save a bunch of DB checks before
  @ensureNotBusy()
  private async produceUnprovenBlock() {
    const mempoolLength = await this.mempool.length();
    // Produce a block if either produceEmptyBlocks is true or we have more
    // than 1 tx in mempool or messages
    if (mempoolLength > 0 || (this.config.produceEmptyBlocks ?? true)) {
      await this.produceBlock();
    }
  }

  @ensureNotBusy()
  private async tryProduceSettlement(): Promise<void> {
    const batch = await this.produceBatch();

    let batches: SettleableBatch[] | undefined = undefined;
    if (this.isFirstSettlement) {
      const rawBatches = await this.batchProducerModule?.getSettleableBatches();
      if (rawBatches !== undefined) {
        batches = await mapSequential(
          rawBatches,
          async (rawBatch) =>
            await this.batchProducerModule!.recoverSettleableBatch(rawBatch)
        );
      }
      this.isFirstSettlement = false;
    } else if (batch !== undefined) {
      batches = [batch];
    }

    if (batches !== undefined) {
      await this.settle(batches, this.config.settlementTokenConfig);
    }
  }

  public async close(): Promise<void> {
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
  }
}
