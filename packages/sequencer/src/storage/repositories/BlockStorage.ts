import { ComputedBlock } from "../model/Block";

export interface BlockStorage {
  getCurrentBlockHeight: () => Promise<number>;
  pushBlock: (block: ComputedBlock) => Promise<void>;
}

export interface HistoricalBlockStorage {
  getBlockAt: (height: number) => Promise<ComputedBlock | undefined>;
}