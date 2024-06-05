import { ComputedBlock } from "../model/Block";

export interface BlockStorage {
  // TODO Rename to getCurrentChainLength(), blockheight seems misleading here
  getCurrentBlockHeight: () => Promise<number>;
  getLatestBlock: () => Promise<ComputedBlock | undefined>;
  pushBlock: (block: ComputedBlock) => Promise<void>;
}

export interface HistoricalBlockStorage {
  getBlockAt: (height: number) => Promise<ComputedBlock | undefined>;
}
