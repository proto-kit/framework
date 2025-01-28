import { BlockWithPreviousResult } from "../../protocol/production/BatchProducerModule";
import {
  Block,
  BlockResult,
  BlockWithMaybeResult,
  BlockWithResult,
} from "../model/Block";

export interface BlockQueue {
  pushBlock: (block: Block) => Promise<void>;
  pushResult: (result: BlockResult) => Promise<void>;
  getNewBlocks: () => Promise<BlockWithPreviousResult[]>;
  getLatestBlockAndResult: () => Promise<BlockWithMaybeResult | undefined>;
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
