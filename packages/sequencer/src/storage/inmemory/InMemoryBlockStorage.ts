import {
  HistoricalUnprovenBlockStorage,
  UnprovenBlockQueue,
  UnprovenBlockStorage,
} from "../repositories/UnprovenBlockStorage";
import {
  UnprovenBlock,
  UnprovenBlockMetadata,
  UnprovenBlockWithMetadata,
} from "../../protocol/production/unproven/TransactionExecutionService";
import { UnprovenBlockWithPreviousMetadata } from "../../protocol/production/BlockProducerModule";

export class InMemoryBlockStorage
  implements
    UnprovenBlockStorage,
    HistoricalUnprovenBlockStorage,
    UnprovenBlockQueue
{
  private readonly blocks: UnprovenBlock[] = [];

  private readonly metadata: UnprovenBlockMetadata[] = [];

  private cursor = 0;

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

  public async popNewBlocks(
    remove: boolean
  ): Promise<UnprovenBlockWithPreviousMetadata[]> {
    const slice = this.blocks.slice(this.cursor);

    let metadata: (UnprovenBlockMetadata | undefined)[] = this.metadata.slice(
      Math.max(this.cursor - 1, 0)
    );
    if (this.cursor === 0) {
      metadata = [undefined, ...metadata];
    }

    if (remove) {
      this.cursor = this.blocks.length;
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
}
