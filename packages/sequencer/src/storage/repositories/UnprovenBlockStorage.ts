import { UnprovenBlock } from "../../protocol/production/unproven/TransactionExecutionService";

export interface UnprovenBlockQueue {
  pushBlock: (block: UnprovenBlock) => Promise<void>;
  popNewBlocks: (remove: boolean) => Promise<UnprovenBlock[]>;
}

export interface UnprovenBlockStorage {
  getCurrentBlockHeight: () => Promise<number>;
  pushBlock: (block: UnprovenBlock) => Promise<void>;
}

export interface HistoricalUnprovenBlockStorage {
  getBlockAt: (height: number) => Promise<UnprovenBlock | undefined>;
}
