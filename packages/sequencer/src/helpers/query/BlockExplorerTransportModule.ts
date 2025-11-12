import { BlockModel } from "@proto-kit/api";

export interface BlockExplorerTransportModule {
  waitTxInclusion(txHash: string): Promise<string>;
  getBlock(param?: string | number): Promise<BlockModel | undefined>;
}
