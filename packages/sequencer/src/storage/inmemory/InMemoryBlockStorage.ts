import { inject, injectable } from "tsyringe";

import {
  HistoricalUnprovenBlockStorage,
  UnprovenBlockQueue,
  UnprovenBlockStorage,
} from "../repositories/UnprovenBlockStorage";
import type {
  UnprovenBlock,
  UnprovenBlockMetadata,
  UnprovenBlockWithMetadata,
} from "../model/UnprovenBlock";
import { UnprovenBlockWithPreviousMetadata } from "../../protocol/production/BlockProducerModule";
import { BlockStorage } from "../repositories/BlockStorage";

@injectable()
export class InMemoryBlockStorage
  implements
    UnprovenBlockStorage,
    HistoricalUnprovenBlockStorage,
    UnprovenBlockQueue
{
  public constructor(
    @inject("BlockStorage") private readonly batchStorage: BlockStorage
  ) {}

  private readonly blocks: UnprovenBlock[] = [];

  private readonly metadata: UnprovenBlockMetadata[] = [];

  public async getBlockAt(height: number): Promise<UnprovenBlock | undefined> {
    return this.blocks.at(height);
  }

  public async getCurrentBlockHeight(): Promise<number> {
    return this.blocks.length;
  }

  public async getLatestBlock(): Promise<
    UnprovenBlockWithMetadata | undefined
  > {
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

  public async getNewBlocks(): Promise<UnprovenBlockWithPreviousMetadata[]> {
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

    let metadata: (UnprovenBlockMetadata | undefined)[] = this.metadata.slice(
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

  public async pushBlock(block: UnprovenBlock): Promise<void> {
    this.blocks.push(block);
  }

  public async getNewestMetadata(): Promise<UnprovenBlockMetadata | undefined> {
    return this.metadata.length > 0 ? this.metadata.at(-1) : undefined;
  }

  public async pushMetadata(metadata: UnprovenBlockMetadata): Promise<void> {
    this.metadata.push(metadata);
  }

  public async getBlock(hash: string): Promise<UnprovenBlock | undefined> {
    return this.blocks.find((block) => block.hash.toString() === hash);
  }
}
