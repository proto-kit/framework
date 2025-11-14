import { inject, injectable } from "tsyringe";
import { sleep } from "@proto-kit/common";

import {
  BlockExplorerTransportModule,
  ClientBlock,
} from "./BlockExplorerTransportModule";

export enum InclusionStatus {
  UNKNOWN = "unknown",
  PENDING = "pending",
  INCLUDED = "included",
  SETTLED = "settled",
}

@injectable()
export class BlockExplorerQuery {
  public constructor(
    @inject("BlockExplorerTransportModule")
    private readonly blockExplorer: BlockExplorerTransportModule
  ) {}

  /**
   * Waits for a transaction to be included in a block by polling at regular intervals.
   *
   * @param txHash - Hash string of the transaction to search for
   * @param interval - Polling interval in milliseconds (default: 1000)
   * @param maxAttempts - Maximum number of polling attempts (default: 10)
   * @returns Promise resolving to an object containing the transaction inclusion state
   *
   * @example
   * ```typescript
   * // Wait with default settings (1s interval, 10 attempts)
   * const result = await blockExplorer.fetchTxInclusion(txHash);
   *
   * // Wait with custom interval (500ms) and more attempts (20)
   * const result = await blockExplorer.fetchTxInclusion(txHash, 500, 20);
   * ```
   */
  public async fetchTxInclusion(
    txHash: string,
    interval = 1000,
    maxAttempts = 10
  ): Promise<{ transactionState: InclusionStatus }> {
    let remainingAttempts = maxAttempts;

    while (remainingAttempts > 0) {
      // eslint-disable-next-line no-await-in-loop
      const status = await this.blockExplorer.fetchTxInclusion(txHash);
      if (status === "INCLUDED") {
        return { transactionState: InclusionStatus.INCLUDED };
      }

      remainingAttempts -= 1;
      if (remainingAttempts <= 0) {
        return { transactionState: InclusionStatus.UNKNOWN };
      }

      // eslint-disable-next-line no-await-in-loop
      await sleep(interval);
    }

    return { transactionState: InclusionStatus.UNKNOWN };
  }

  /**
   * Retrieves a block by its hash or height.
   *
   * @param {string|number} [param] - Block hash (string) or height (number).
   * If omitted, returns the latest block.
   * @returns {Promise<ClientBlock | undefined>} Promise resolving to a
   * ClientBlock object, or undefined if block is not found
   *
   * @example
   * // Get block by hash
   * const block = await blockExplorer.getBlock("216543...");
   *
   * @example
   * // Get block by height
   * const block = await blockExplorer.getBlock(42);
   */

  async getBlock(
    param: { hash: string } | { height: number }
  ): Promise<ClientBlock | undefined> {
    const block = await this.blockExplorer.getBlock(param);
    if (block) {
      return block;
    }
    return undefined;
  }
}
