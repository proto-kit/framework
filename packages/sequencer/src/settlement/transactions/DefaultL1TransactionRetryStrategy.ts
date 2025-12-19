import { noop, sleep } from "@proto-kit/common";
import { Transaction, UInt64 } from "o1js";
import { inject } from "tsyringe";

import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { PendingL1TransactionRecord } from "../../storage/repositories/PendingL1TransactionStorage";
import { FeeStrategy } from "../../protocol/baselayer/fees/FeeStrategy";

import { L1TransactionRetryStrategy } from "./L1TransactionRetryStrategy";

export type TransactionRetryConfig = {
  maxAttempts?: number;
  feeMultiplier?: number;
  maxFee?: number;
  retryDelayMs?: number;
};

const DEFAULT_RETRY_CONFIG: Required<TransactionRetryConfig> = {
  maxAttempts: 3,
  feeMultiplier: 1.1,
  maxFee: 10 * 1e9,
  retryDelayMs: 60 * 1000, // 1 minute
};

@sequencerModule()
export class DefaultL1TransactionRetryStrategy
  extends SequencerModule<TransactionRetryConfig>
  implements L1TransactionRetryStrategy
{
  public constructor(
    @inject("FeeStrategy") private readonly feeStrategy: FeeStrategy
  ) {
    super();
  }

  private get retryConfig(): Required<TransactionRetryConfig> {
    return {
      maxAttempts: this.config.maxAttempts ?? DEFAULT_RETRY_CONFIG.maxAttempts,
      feeMultiplier:
        this.config.feeMultiplier ?? DEFAULT_RETRY_CONFIG.feeMultiplier,
      maxFee: this.config.maxFee ?? DEFAULT_RETRY_CONFIG.maxFee,
      retryDelayMs:
        this.config.retryDelayMs ?? DEFAULT_RETRY_CONFIG.retryDelayMs,
    };
  }

  public async start(): Promise<void> {
    noop();
  }

  public async shouldRetry(
    record: PendingL1TransactionRecord
  ): Promise<boolean> {
    return record.attempts < this.retryConfig.maxAttempts;
  }

  public async prepareRetryTransaction(
    record: PendingL1TransactionRecord
  ): Promise<Transaction<any, false>> {
    const tx = record.transaction;
    const currentFee = tx.transaction.feePayer.body.fee;
    const newFee = UInt64.from(this.bumpFee(Number(currentFee.toBigInt())));
    await tx.setFee(newFee);
    // Delay if needed
    await sleep(
      Math.max(
        0,
        this.retryConfig.retryDelayMs -
          (Date.now() - (record.sentAt?.getTime() ?? 0))
      )
    );
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return tx as Transaction<any, false>;
  }

  private bumpFee(currentFee: number): number {
    const { feeMultiplier, maxFee } = this.retryConfig;
    const baseFee = this.feeStrategy.getFee();
    const bumped = Number(currentFee) * feeMultiplier;
    return Math.floor(Math.min(Math.max(bumped, baseFee), maxFee));
  }
}
