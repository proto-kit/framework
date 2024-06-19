import { UnprovenBlockWithMetadata } from "@proto-kit/sequencer";

export interface PaginatedResult<Item> {
  items: (Item | undefined)[];
  totalCount: number;
}

export interface UnprovenBlockFilter {
  hash?: string;
  height?: string;
  isEmpty?: boolean;
}

export interface UnprovenBlockPagination {
  take: number;
  skip?: number;
}

export interface UnprovenBlockStorage {
  getCurrentBlockHeight: () => Promise<number>;
  pushBlock: (block: UnprovenBlockWithMetadata) => Promise<void>;
  getBlocks: (
    pagination: UnprovenBlockPagination,
    filter?: UnprovenBlockFilter
  ) => Promise<PaginatedResult<UnprovenBlockWithMetadata>>;
}
