import { UnprovenBlockWithPreviousMetadata } from "../../protocol/production/BlockProducerModule";
import type { UnprovenBlock, UnprovenBlockMetadata } from "../model/UnprovenBlock";

export interface UnprovenBlockQueue {
  pushBlock: (block: UnprovenBlock) => Promise<void>;
  pushMetadata: (metadata: UnprovenBlockMetadata) => Promise<void>;
  getNewBlocks: () => Promise<UnprovenBlockWithPreviousMetadata[]>;
  getNewestMetadata: () => Promise<UnprovenBlockMetadata | undefined>;
}

export interface UnprovenBlockStorage {
  getCurrentBlockHeight: () => Promise<number>;
  getLatestBlock: () => Promise<UnprovenBlock | undefined>;
  pushBlock: (block: UnprovenBlock) => Promise<void>;
}

export interface HistoricalUnprovenBlockStorage {
  getBlockAt: (height: number) => Promise<UnprovenBlock | undefined>;
  getBlock: (transactionsHash: string) => Promise<UnprovenBlock | undefined>;
}
