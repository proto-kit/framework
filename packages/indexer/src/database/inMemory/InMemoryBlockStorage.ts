import { UnprovenBlock } from "@proto-kit/sequencer";
import { injectable } from "tsyringe";
import { BlockStorage } from "../BlockStorage";

@injectable()
export class InMemoryBlockStorage implements BlockStorage {
  public blocks: Record<string, UnprovenBlock | undefined> = {};

  public async pushBlock(block: UnprovenBlock) {
    this.blocks[block.height.toString()] = block;
  }

  public async getBlockAt(height: number) {
    return this.blocks[height.toString()];
  }

  public async getBlocksFromTo(
    fromHeight: number,
    toHeight: number
  ): Promise<UnprovenBlock[] | undefined> {
    let blocks: UnprovenBlock[] = [];
    for (let height = fromHeight; height <= toHeight; height++) {
      const block = await this.getBlockAt(height);
      block && blocks.push(block);
    }
    return blocks;
  }
}
