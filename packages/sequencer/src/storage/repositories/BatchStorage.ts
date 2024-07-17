import { Batch } from "../model/Batch";

export interface BatchStorage {
  // TODO Rename to getCurrentChainLength(), blockheight seems misleading here
  getCurrentBlockHeight: () => Promise<number>;
  getLatestBlock: () => Promise<Batch | undefined>;
  pushBlock: (block: Batch) => Promise<void>;
}

export interface HistoricalBatchStorage {
  getBlockAt: (height: number) => Promise<Batch | undefined>;
}
