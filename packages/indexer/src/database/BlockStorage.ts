import { UnprovenBlock } from "@proto-kit/sequencer";

export interface BlockStorage {
  pushBlock: (block: UnprovenBlock) => Promise<void>;
  getBlockAt: (height: number) => Promise<UnprovenBlock | undefined>;
  getBlocksFromTo(
    fromHeight: number,
    toHeight: number
  ): Promise<UnprovenBlock[] | undefined>;
}
