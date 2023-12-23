import {
  UnprovenBlock,
  UnprovenBlockMetadata
} from "../../protocol/production/unproven/TransactionExecutionService";
import {
  UnprovenBlockWithPreviousMetadata
} from "../../protocol/production/BlockProducerModule";

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
}
