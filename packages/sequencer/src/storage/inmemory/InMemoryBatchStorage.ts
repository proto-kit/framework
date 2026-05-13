import { log } from "@proto-kit/common";
import { inject, injectable } from "tsyringe";

import { BatchStorage } from "../repositories/BatchStorage";
import { Batch } from "../model/Batch";
import { SettlementStorage } from "../repositories/SettlementStorage";

@injectable()
export class InMemoryBatchStorage implements BatchStorage {
  public constructor(
    @inject("SettlementStorage")
    private readonly settlementStorage: SettlementStorage
  ) {}

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

  public async getUnsettledBatches(): Promise<Batch[]> {
    const latestSettlement = await this.settlementStorage.getLatestSettlement();
    if (latestSettlement !== undefined) {
      const highestBatchHeight = Math.max(...latestSettlement.batches);
      return this.batches.filter((batch) => batch.height > highestBatchHeight);
    } else {
      return this.batches;
    }
  }
}
