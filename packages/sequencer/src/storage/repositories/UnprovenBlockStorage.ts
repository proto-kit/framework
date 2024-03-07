import { UnprovenBlockWithPreviousMetadata } from "../../protocol/production/BlockProducerModule";
import type {
  UnprovenBlock,
  UnprovenBlockMetadata,
  UnprovenBlockWithMetadata,
} from "../model/UnprovenBlock";

export interface UnprovenBlockQueue {
  pushBlock: (block: UnprovenBlock) => Promise<void>;
  pushMetadata: (metadata: UnprovenBlockMetadata) => Promise<void>;
  getNewBlocks: () => Promise<UnprovenBlockWithPreviousMetadata[]>;
  getLatestBlock: () => Promise<UnprovenBlockWithMetadata | undefined>;
}

export interface UnprovenBlockStorage {
  getCurrentBlockHeight: () => Promise<number>;
  getLatestBlock: () => Promise<UnprovenBlockWithMetadata | undefined>;
  pushBlock: (block: UnprovenBlock) => Promise<void>;
}

export interface HistoricalUnprovenBlockStorage {
  getBlockAt: (height: number) => Promise<UnprovenBlock | undefined>;
  getBlock: (hash: string) => Promise<UnprovenBlock | undefined>;
}
