import { log } from "@proto-kit/common";

import {
  BatchStorage,
  HistoricalBatchStorage,
} from "../repositories/BatchStorage";
import { Batch } from "../model/Batch";

export class InMemoryBatchStorage
  implements BatchStorage, HistoricalBatchStorage
{
  private readonly batches: Batch[] = [];

  public async getCurrentBatchHeight(): Promise<number> {
    return this.batches.length;
  }

  public async getBatchAt(height: number): Promise<Batch | undefined> {
    return this.batches.at(height);
  }

  public async pushBatch(batch: Batch): Promise<void> {
    log.info("Pushed Batch");
    this.batches.push(batch);
  }

  public async getLatestBatch(): Promise<Batch | undefined> {
    return this.batches.at(-1);
  }
}
