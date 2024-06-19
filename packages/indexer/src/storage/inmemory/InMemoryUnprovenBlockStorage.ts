import { UnprovenBlockWithMetadata } from "@proto-kit/sequencer";
import { injectable } from "tsyringe";

import {
  UnprovenBlockFilter,
  UnprovenBlockPagination,
  UnprovenBlockStorage,
} from "../repositories/UnprovenBlockStorage";

@injectable()
export class InMemoryUnprovenBlockStorage implements UnprovenBlockStorage {
  public blocks: UnprovenBlockWithMetadata[] = [];

  public async getCurrentBlockHeight() {
    // first block is height 0, so we need to subtract by 1 here
    return this.blocks.length ? this.blocks.length - 1 : 0;
  }

  public async pushBlock(block: UnprovenBlockWithMetadata) {
    // add the block to the front of the array, so that the latest block is at index 0
    // this gives us a descending order of blocks
    this.blocks.unshift(block);
  }

  public async getBlocks(
    pagination: UnprovenBlockPagination,
    filter?: UnprovenBlockFilter
  ) {
    let blocks = [...this.blocks];

    if (filter?.hash !== undefined) {
      blocks = blocks.filter(
        ({ block }) => block.hash.toString() === filter.hash?.toString()
      );
    }

    if (filter?.isEmpty !== undefined) {
      blocks = blocks.filter(({ block }) =>
        filter.isEmpty === true
          ? block.transactions.length === 0
          : block.transactions.length > 0
      );
    }

    if (filter?.height !== undefined) {
      blocks = blocks.filter(
        ({ block }) => block.height.toString() === filter.height?.toString()
      );
    }

    const totalCount = blocks.length;

    const start = pagination.skip ?? 0;
    const end = (pagination.skip ?? 0) + pagination.take;

    const items = blocks.slice(start, end);

    return {
      items,
      totalCount,
    };
  }
}
