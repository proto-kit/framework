import { inject, injectable } from "tsyringe";

import {
  HistoricalBlockStorage,
  BlockQueue,
  BlockStorage,
} from "../repositories/BlockStorage";
import type {
  Block,
  BlockResult,
  BlockWithMaybeResult,
  BlockWithResult,
} from "../model/Block";
import { BlockWithPreviousResult } from "../../protocol/production/BatchProducerModule";
import { BatchStorage } from "../repositories/BatchStorage";

@injectable()
export class InMemoryBlockStorage
  implements BlockStorage, HistoricalBlockStorage, BlockQueue
{
  public constructor(
    @inject("BatchStorage") private readonly batchStorage: BatchStorage
  ) {}

  private readonly blocks: Block[] = [];

  private readonly results: BlockResult[] = [];

  public async getBlockAt(height: number): Promise<Block | undefined> {
    return this.blocks.at(height);
  }

  public async getCurrentBlockHeight(): Promise<number> {
    return this.blocks.length;
  }

  public async getLatestBlockAndResult(): Promise<
    BlockWithMaybeResult | undefined
  > {
    const currentHeight = await this.getCurrentBlockHeight();
    const block = await this.getBlockAt(currentHeight - 1);
    const result: BlockResult | undefined = this.results[currentHeight - 1];
    if (block === undefined) {
      return undefined;
    }
    return {
      block,
      result,
    };
  }

  public async getLatestBlock(): Promise<BlockWithResult | undefined> {
    const result = await this.getLatestBlockAndResult();
    if (result !== undefined) {
      if (result.result === undefined) {
        throw new Error(
          `Block result for block ${result.block.height.toString()} not found`
        );
      }
      return {
        block: result.block,
        result: result.result,
      };
    }
    return result;
  }

  public async getNewBlocks(): Promise<BlockWithPreviousResult[]> {
    const latestBatch = await this.batchStorage.getLatestBatch();

    let cursor = 0;
    if (latestBatch !== undefined) {
      cursor = this.blocks.reduce(
        (c, block, index) =>
          latestBatch.blockHashes.includes(block.hash.toString())
            ? index + 1
            : c,
        0
      );
    }

    const slice = this.blocks.slice(cursor);

    let results: (BlockResult | undefined)[] = this.results.slice(
      Math.max(cursor - 1, 0)
    );
    if (cursor === 0) {
      results = [undefined, ...results];
    }

    return slice.map((block, index) => ({
      block: {
        block,
        result: results[index + 1]!,
      },
      lastBlockResult: results[index],
    }));
  }

  public async pushBlock(block: Block): Promise<void> {
    this.blocks.push(block);
  }

  public async getNewestResult(): Promise<BlockResult | undefined> {
    return this.results.length > 0 ? this.results.at(-1) : undefined;
  }

  public async pushResult(result: BlockResult): Promise<void> {
    this.results.push(result);
  }

  public async getBlock(hash: string): Promise<Block | undefined> {
    return this.blocks.find((block) => block.hash.toString() === hash);
  }
}
