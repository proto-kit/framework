import { inject, injectable } from "tsyringe";

import {
  HistoricalBlockStorage,
  BlockQueue,
  BlockStorage,
} from "../repositories/BlockStorage";
import type { Block, BlockResult, BlockWithResult } from "../model/Block";
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

  private readonly metadata: BlockResult[] = [];

  public async getBlockAt(height: number): Promise<Block | undefined> {
    return this.blocks.at(height);
  }

  public async getCurrentBlockHeight(): Promise<number> {
    return this.blocks.length;
  }

  public async getLatestBlock(): Promise<BlockWithResult | undefined> {
    const currentHeight = await this.getCurrentBlockHeight();
    const block = await this.getBlockAt(currentHeight - 1);
    const metadata = this.metadata[currentHeight - 1];
    if (block === undefined) {
      return undefined;
    }
    return {
      block,
      metadata,
    };
  }

  public async getNewBlocks(): Promise<BlockWithPreviousResult[]> {
    const latestBatch = await this.batchStorage.getLatestBlock();

    let cursor = 0;
    if (latestBatch !== undefined) {
      cursor = this.blocks.reduce(
        (c, block, index) =>
          latestBatch.bundles.includes(block.hash.toString()) ? index + 1 : c,
        0
      );
    }

    const slice = this.blocks.slice(cursor);

    let metadata: (BlockResult | undefined)[] = this.metadata.slice(
      Math.max(cursor - 1, 0)
    );
    if (cursor === 0) {
      metadata = [undefined, ...metadata];
    }

    return slice.map((block, index) => ({
      block: {
        block,
        metadata: metadata[index + 1]!,
      },
      lastBlockMetadata: metadata[index],
    }));
  }

  public async pushBlock(block: Block): Promise<void> {
    this.blocks.push(block);
  }

  public async getNewestMetadata(): Promise<BlockResult | undefined> {
    return this.metadata.length > 0 ? this.metadata.at(-1) : undefined;
  }

  public async pushMetadata(metadata: BlockResult): Promise<void> {
    this.metadata.push(metadata);
  }

  public async getBlock(hash: string): Promise<Block | undefined> {
    return this.blocks.find((block) => block.hash.toString() === hash);
  }
}
