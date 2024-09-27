import { inject, injectable } from "tsyringe";
import { log } from "@proto-kit/common";

import { ProcessorModule } from "../ProcessorModule";
import { BlockStorage } from "../storage/BlockStorage";
import { BlockFetching } from "../indexer/BlockFetching";
import { HandlersExecutor, HandlersRecord } from "../handlers/HandlersExecutor";
import { BasePrismaClient } from "../handlers/BasePrismaClient";

export interface TimedProcessorTriggerConfig {
  interval?: number;
}

@injectable()
export class TimedProcessorTrigger extends ProcessorModule<TimedProcessorTriggerConfig> {
  public constructor(
    @inject("BlockStorage") public blockStorage: BlockStorage,
    @inject("BlockFetching") public blockFetching: BlockFetching,
    @inject("HandlersExecutor")
    public handlersExecutor: HandlersExecutor<
      BasePrismaClient,
      HandlersRecord<BasePrismaClient>
    >
  ) {
    super();
  }

  public async tryProcessNextBlock() {
    try {
      await this.processNextBlock();
    } catch (error) {
      log.error("Error processing block", error);
    }
  }

  public async processNextBlock() {
    const lastProcessedBlockHeight =
      await this.blockStorage.getLastProcessedBlockHeight();

    const nextBlockHeight =
      lastProcessedBlockHeight !== undefined ? lastProcessedBlockHeight + 1 : 0;
    const block = await this.blockFetching.fetchBlock(nextBlockHeight);

    if (!block) {
      throw new Error(`Block #${nextBlockHeight} not indexed yet`);
    }

    if (lastProcessedBlockHeight === Number(block?.block.height.toBigInt())) {
      throw new Error(
        `Block height #${lastProcessedBlockHeight} was already processed`
      );
    }

    log.info(`Processing block #${block?.block.height.toString()}`);
    const startTime = Date.now();

    await this.handlersExecutor.execute(block);

    log.info(
      `Block #${block?.block.height.toString()} processed in ${Date.now() - startTime}ms`
    );

    return block;
  }

  public async start() {
    let catchingUp = true;

    while (catchingUp) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await this.processNextBlock();
      } catch (error) {
        log.error(error);
        catchingUp = false;
      }
    }

    log.info(
      "Processor caught up to the latest indexed block, starting polling"
    );

    setInterval(
      () => this.tryProcessNextBlock(),
      this.config.interval ?? 10000
    );
  }
}
