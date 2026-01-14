import { Transaction } from "o1js";
import { inject, injectable } from "tsyringe";
import { log } from "@proto-kit/common";

import {
  PendingL1TransactionRecord,
  PendingL1TransactionStorage,
} from "../../storage/repositories/PendingL1TransactionStorage";
import { MinaSigner } from "../MinaSigner";
import type { MinaBaseLayer } from "../../protocol/baselayer/MinaBaseLayer";

import { L1TransactionRetryStrategy } from "./L1TransactionRetryStrategy";
import { TxStatusWaiter } from "./TxStatusWaiter";
import { checkZkappTransactionStatus } from "./ZkappTransactionStatus";

export interface DispatcherConfig {
  pollIntervalMs?: number;
  statusCheckIntervalMs?: number;
  inclusionTimeoutMs?: number;
}

@injectable()
export class L1TransactionDispatcher {
  private pollingTimeout?: NodeJS.Timeout;

  /**
   * Serialize all dispatcher work (polling ticks and sender-level wakeups) to avoid
   * concurrent send attempts of the same queued transaction.
   */
  private workInFlight?: Promise<void>;

  public constructor(
    @inject("PendingL1TransactionStorage")
    private readonly pendingStorage: PendingL1TransactionStorage,
    @inject("L1TransactionRetryStrategy")
    private readonly retryStrategy: L1TransactionRetryStrategy,
    @inject("SettlementSigner") private readonly signer: MinaSigner,
    private readonly waiter: TxStatusWaiter,
    @inject("L1TransactionDispatcherConfig")
    private readonly config: Required<DispatcherConfig>,
    @inject("BaseLayer")
    private readonly baseLayer: MinaBaseLayer
  ) {}

  public start() {
    this.startPolling();
  }

  public async stop(): Promise<void> {
    if (this.pollingTimeout !== undefined) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = undefined;
    }
  }

  public requestDispatch(sender: string) {
    void this.enqueueWork(async () => {
      const txs = await this.pendingStorage.findByStatuses(["queued", "sent"]);
      await this.processSender(sender, txs);
    });
  }

  private startPolling() {
    const poll = async () => {
      try {
        await this.enqueueWork(async () => {
          await this.tick();
        });
      } catch (e) {
        log.error("Error in L1TransactionDispatcher polling loop", e);
      } finally {
        this.pollingTimeout = setTimeout(poll, this.config.pollIntervalMs);
        this.pollingTimeout.unref?.();
      }
    };
    this.pollingTimeout = setTimeout(poll, this.config.pollIntervalMs);
    this.pollingTimeout.unref?.();
  }

  private async enqueueWork(work: () => Promise<void>): Promise<void> {
    const previous = this.workInFlight ?? Promise.resolve();
    const next = previous.then(work, work);
    this.workInFlight = next.finally(() => {
      if (this.workInFlight === next) {
        this.workInFlight = undefined;
      }
    });
    return await this.workInFlight;
  }

  private async tick(): Promise<void> {
    const now = new Date();
    const pendingTransactions = (
      await this.pendingStorage.findByStatuses(["queued", "sent"])
    ).filter((r) => (r.nextActionAt ?? now) <= now);

    const bySender: Record<string, PendingL1TransactionRecord[]> = {};
    for (const tx of pendingTransactions) {
      (bySender[tx.sender] ??= []).push(tx);
    }

    for (const sender of Object.keys(bySender)) {
      // eslint-disable-next-line no-await-in-loop
      await this.processSender(sender, bySender[sender]);
    }
  }

  private async processSender(
    sender: string,
    txsInput: PendingL1TransactionRecord[]
  ): Promise<void> {
    // Sort in ascending order of nonce
    const txsSorted = txsInput
      .sort((a, b) => a.nonce - b.nonce)
      .filter((r) => r.sender === sender);

    // Send queued txs in ascending nonce order. Then check sent txs.
    for (const record of txsSorted) {
      if (record.status === "queued") {
        // eslint-disable-next-line no-await-in-loop
        await this.sendQueuedTransaction(record.id);
      } else if (record.status === "sent") {
        // eslint-disable-next-line no-await-in-loop
        await this.checkSentTransaction(record.id);
      }
    }
  }

  private async sendQueuedTransaction(txId: string): Promise<void> {
    const record = await this.pendingStorage.findById(txId);
    if (!record) return;
    if (record.status !== "queued") return;

    await this.sendTransaction(record);
  }

  private async sendTransaction(
    record: Omit<
      PendingL1TransactionRecord,
      "status" | "sentAt" | "lastError" | "nextActionAt" | "hash"
    >
  ): Promise<void> {
    const tx = record.transaction;
    try {
      const pendingTx = await tx.send();
      const now = new Date();

      await this.pendingStorage.update(record.id, {
        status: "sent",
        attempts: record.attempts + 1,
        sentAt: now,
        transaction: tx,
        hash: pendingTx.hash,
        lastError: undefined,
        nextActionAt: new Date(
          now.getTime() + this.config.statusCheckIntervalMs
        ),
      });
      log.info(
        `Sent L1 transaction ${pendingTx.hash} for nonce ${record.nonce} (Attempt ${record.attempts + 1})`
      );
      this.waiter.notifySent(record.id, pendingTx.hash);
    } catch (error) {
      log.error(
        `Failed to send transaction ${record.sender}:${record.nonce}`,
        error
      );
      await this.pendingStorage.update(record.id, {
        status: "failed",
        lastError: error instanceof Error ? error.message : String(error),
      });
      this.waiter.notifyFailed(record.id, error);
    }
  }

  private async checkSentTransaction(txId: string): Promise<void> {
    const record = await this.pendingStorage.findById(txId);
    if (!record) return;
    if (record.status !== "sent") return;

    if (record.hash === undefined || record.hash.length === 0) {
      await this.retryTransaction(record);
      return;
    }

    // don't check status on local chain
    if (this.baseLayer.isLocalBlockChain()) {
      await this.pendingStorage.update(record.id, {
        status: "included",
      });
      this.waiter.notifyIncluded(record.id, record.hash);
      return;
    }

    // Single status check (no long blocking loops)
    const result = await checkZkappTransactionStatus(record.hash);
    if (result.success) {
      await this.pendingStorage.update(record.id, {
        status: "included",
      });
      this.waiter.notifyIncluded(record.id, record.hash);
      return;
    } else if (result.failureReason) {
      log.error(`Transaction ${record.hash} failed`, result.failureReason);
      await this.retryTransaction(record);
      return;
    } else if (!result.success) {
      // recheck status after a timeout
      const now = new Date();
      const sentAt = record.sentAt?.getTime() ?? 0;
      const elapsed = now.getTime() - sentAt;
      if (elapsed < this.config.inclusionTimeoutMs) {
        await this.pendingStorage.update(record.id, {
          nextActionAt: new Date(
            now.getTime() + this.config.statusCheckIntervalMs
          ),
        });
        return;
      }
    }

    // if the transaction is not included after the inclusionTimeoutMs, retry the transaction
    await this.retryTransaction(record);
  }

  private async retryTransaction(
    record: PendingL1TransactionRecord
  ): Promise<void> {
    const latest = await this.pendingStorage.findById(record.id);
    if (!latest) return;
    if (latest.status === "included" || latest.status === "failed") return;

    const shouldRetry = await this.retryStrategy.shouldRetry(latest);
    if (!shouldRetry) {
      await this.pendingStorage.update(latest.id, {
        status: "failed",
        lastError: latest.lastError ?? "Max attempts reached",
      });
      this.waiter.notifyFailed(
        latest.id,
        new Error(`Max attempts reached for ${latest.sender}:${latest.nonce}`)
      );
      return;
    }

    try {
      // If the strategy wants a delay, schedule using nextActionAt
      const delayMs = this.retryStrategy.getRetryDelayMs?.(latest) ?? 0;
      const now = new Date();
      const earliestRetryAt =
        latest.sentAt !== undefined
          ? new Date(latest.sentAt.getTime() + delayMs)
          : now;
      if (earliestRetryAt > now) {
        await this.pendingStorage.update(latest.id, {
          nextActionAt: earliestRetryAt,
        });
        return;
      }

      const retryTx = await this.retryStrategy.prepareRetryTransaction(latest);
      const signedRetryTx = this.signer.signTx(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        retryTx as Transaction<false, false>
      );
      await this.sendTransaction({
        ...latest,
        transaction: signedRetryTx,
      });
    } catch (error) {
      log.error(`Failed to retry ${latest.sender}:${latest.nonce}`, error);
      await this.pendingStorage.update(latest.id, {
        status: "failed",
        lastError: error instanceof Error ? error.message : String(error),
      });
      this.waiter.notifyFailed(latest.id, error);
    }
  }
}
