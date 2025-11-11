import { InclusionStatus } from "@proto-kit/api";

export interface BlockExplorerTransportModule {
  fetchTxStatus(txHash: string): Promise<InclusionStatus>;
  getBlock(param?: string | number): Promise<any>;
}