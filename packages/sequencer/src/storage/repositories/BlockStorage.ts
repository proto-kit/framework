import { BlockWithPreviousResult } from "../../protocol/production/BatchProducerModule";
import type {
  Block,
  BlockResult,
  BlockWithResult,
} from "../model/Block";

export interface BlockQueue {
  pushBlock: (block: Block) => Promise<void>;
  pushMetadata: (metadata: BlockResult) => Promise<void>;
  getNewBlocks: () => Promise<BlockWithPreviousResult[]>;
  getLatestBlock: () => Promise<BlockWithResult | undefined>;
}

export interface BlockStorage {
  getCurrentBlockHeight: () => Promise<number>;
  getLatestBlock: () => Promise<BlockWithResult | undefined>;
  pushBlock: (block: Block) => Promise<void>;
}

export interface HistoricalBlockStorage {
  getBlockAt: (height: number) => Promise<Block | undefined>;
  getBlock: (hash: string) => Promise<Block | undefined>;
}
