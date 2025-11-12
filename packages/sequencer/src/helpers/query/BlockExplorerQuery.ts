import { inject, injectable } from "tsyringe";
import { sleep } from "@proto-kit/common";
import { InclusionStatus } from "@proto-kit/api";
import { BlockExplorerTransportModule } from "./BlockExplorerTransportModule";

export type TransactionFetcher = (
  txHash: string
) => Promise<InclusionStatus>;

@injectable()
export class BlockExplorerQuery {
  public constructor(
    @inject("BlockExplorerTransportModule") private readonly blockExplorer: BlockExplorerTransportModule
  ) {}

  public async waitTxInclusion(
    txHash: string,
    interval = 1000,
    maxAttempts = 10,
  ): Promise<{ transactionState: InclusionStatus }> {
    let remainingAttempts = maxAttempts;
    
    while (true) {
      const status = await this.blockExplorer.waitTxInclusion(txHash);
      console.log('from transport: ',status);
      if (status === "INCLUDED") {
        return { transactionState: InclusionStatus.INCLUDED };
      }
      
      remainingAttempts -= 1;
      
      if (remainingAttempts <= 0) {
        return { transactionState: InclusionStatus.UNKNOWN };
      }
      
      await sleep(interval);
    }
  }

  async getBlock(param?: string | number): Promise<any> {
    return this.blockExplorer.getBlock(param);
  }
}