export interface BlockExplorer {
  waitTxInclusion(
    txHash: string,
    interval?: number,
    maxAttempts?: number
  ): Promise<any>;
    
  getBlock(
    blockHash: string,
    blockHeight: number
  ): Promise<any>
}