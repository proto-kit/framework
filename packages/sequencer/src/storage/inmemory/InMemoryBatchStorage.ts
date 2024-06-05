import { log } from "@proto-kit/common";

import {
  BlockStorage,
  HistoricalBlockStorage,
} from "../repositories/BlockStorage";
import { ComputedBlock } from "../model/Block";

export class InMemoryBatchStorage
  implements BlockStorage, HistoricalBlockStorage
{
  private readonly blocks: ComputedBlock[] = [];

  public async getCurrentBlockHeight(): Promise<number> {
    return this.blocks.length;
  }

  public async getBlockAt(height: number): Promise<ComputedBlock | undefined> {
    return this.blocks.at(height);
  }

  public async pushBlock(block: ComputedBlock): Promise<void> {
    log.info("Pushed Batch");
    this.blocks.push(block);
  }

  public async getLatestBlock(): Promise<ComputedBlock | undefined> {
    return this.blocks.at(-1);
  }
}
