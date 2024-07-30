import { log } from "@proto-kit/common";

import {
  BatchStorage,
  HistoricalBatchStorage,
} from "../repositories/BatchStorage";
import { Batch } from "../model/Batch";

export class InMemoryBatchStorage
  implements BatchStorage, HistoricalBatchStorage
{
  private readonly blocks: Batch[] = [];

  public async getCurrentBlockHeight(): Promise<number> {
    return this.blocks.length;
  }

  public async getBlockAt(height: number): Promise<Batch | undefined> {
    return this.blocks.at(height);
  }

  public async pushBlock(block: Batch): Promise<void> {
    log.info("Pushed Batch");
    this.blocks.push(block);
  }

  public async getLatestBlock(): Promise<Batch | undefined> {
    return this.blocks.at(-1);
  }
}
