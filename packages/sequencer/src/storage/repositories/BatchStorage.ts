import { Batch } from "../model/Batch";

export interface BatchStorage {
  getCurrentBatchHeight: () => Promise<number>;
  getLatestBatch: () => Promise<Batch | undefined>;
  pushBatch: (block: Batch) => Promise<void>;
  getBatchAt: (height: number) => Promise<Batch | undefined>;
}
