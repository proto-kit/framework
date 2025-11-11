import { InclusionStatus } from "@proto-kit/api";

export interface BlockExplorerTransportModule {
  waitTxInclusion(txHash: string): Promise<InclusionStatus>;
  getBlock(param?: string | number): Promise<any>;
}