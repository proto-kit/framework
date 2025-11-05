export interface BlockExplorer {
    // No type safety for now
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