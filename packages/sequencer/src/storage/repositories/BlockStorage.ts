import type {
  Block,
  BlockResult,
  BlockWithMaybeResult,
  BlockWithResult,
} from "../model/Block";

export interface BlockQueue {
  pushBlock: (block: Block) => Promise<void>;
  pushResult: (result: BlockResult) => Promise<void>;
  getNewBlocks: () => Promise<BlockWithResult[]>;
  getLatestBlockAndResult: () => Promise<BlockWithMaybeResult | undefined>;
}

export interface BlockStorage {
  // TODO Rename to getCurrentChainLength(), blockheight seems misleading here
  getCurrentBlockHeight: () => Promise<number>;
  getLatestBlock: () => Promise<BlockWithResult | undefined>;
  pushBlock: (block: Block) => Promise<void>;

  getBlockAt: (height: number) => Promise<Block | undefined>;
  getBlockWithResultAt: (
    height: number
  ) => Promise<BlockWithResult | undefined>;
  getBlock: (hash: string) => Promise<Block | undefined>;
}
