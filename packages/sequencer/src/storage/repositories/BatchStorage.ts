import { Batch } from "../model/Batch";

export interface BatchStorage {
  // TODO Rename to getCurrentChainLength(), blockheight seems misleading here
  getCurrentBatchHeight: () => Promise<number>;
  getLatestBatch: () => Promise<Batch | undefined>;
  pushBatch: (block: Batch) => Promise<void>;
}

export interface HistoricalBatchStorage {
  getBatchAt: (height: number) => Promise<Batch | undefined>;
}
