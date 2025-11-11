import { injectable } from "tsyringe";
import { sleep } from "@proto-kit/common";
import { InclusionStatus } from "@proto-kit/api";
import { BlockExplorerTransportModule } from "./BlockExplorerTransportModule";

export type TransactionFetcher = (
  txHash: string
) => Promise<InclusionStatus>;

@injectable()
export class BlockExplorerQuery {
  public constructor(
    private readonly blockExplorer: BlockExplorerTransportModule
  ) {}

  public async waitTxInclusion(
    txHash: string,
  ): Promise<{ transactionState: InclusionStatus }> {
    let remainingAttempts = 5;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const status = await this.blockExplorer.fetchTxStatus(txHash);

      if (status === InclusionStatus.INCLUDED) {
        return { transactionState: InclusionStatus.INCLUDED };
      }

      if (remainingAttempts <= 0) {
        return { transactionState: InclusionStatus.UNKNOWN };
      }

      remainingAttempts -= 1;
      // eslint-disable-next-line no-await-in-loop
      await sleep(1000);
    }
  }

  async getBlock(param?: string | number): Promise<any> {
    return this.blockExplorer.getBlock(param);
  }
}