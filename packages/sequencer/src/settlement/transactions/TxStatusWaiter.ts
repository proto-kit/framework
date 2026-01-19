import { inject, injectable, singleton } from "tsyringe";
import {
  EventsRecord,
  ReplayingSingleUseEventEmitter,
  log,
} from "@proto-kit/common";

import {
  PendingL1TransactionRecord,
  PendingL1TransactionStorage,
} from "../../storage/repositories/PendingL1TransactionStorage";

export interface TxLifecycleEvents extends EventsRecord {
  sent: [{ hash: string }];
  included: [{ hash: string }];
  failed: [{ error: unknown }];
}

export type WaitableTxStatus = "sent" | "included";

export interface WaitForTxOptions {
  timeoutMs?: number;
}

@injectable()
@singleton()
export class TxStatusWaiter {
  private readonly emitters = new Map<
    string,
    ReplayingSingleUseEventEmitter<TxLifecycleEvents>
  >();

  public constructor(
    @inject("PendingL1TransactionStorage")
    private readonly pendingStorage: PendingL1TransactionStorage
  ) {}

  private getEmitter(
    txId: string
  ): ReplayingSingleUseEventEmitter<TxLifecycleEvents> {
    let emitter = this.emitters.get(txId);
    if (!emitter) {
      emitter = new ReplayingSingleUseEventEmitter<TxLifecycleEvents>();
      this.emitters.set(txId, emitter);
    }
    return emitter;
  }

  public notifySent(txId: string, hash: string) {
    this.getEmitter(txId).emit("sent", { hash });
  }

  public notifyIncluded(txId: string, hash: string) {
    this.getEmitter(txId).emit("included", { hash });
    this.emitters.delete(txId);
  }

  public notifyFailed(txId: string, error: unknown) {
    this.getEmitter(txId).emit("failed", { error });
    this.emitters.delete(txId);
  }

  private static isSatisfied(
    record: PendingL1TransactionRecord,
    desired: WaitableTxStatus
  ): boolean {
    if (desired === "sent") {
      return record.status === "sent" || record.status === "included";
    }
    return record.status === "included";
  }

  private static toError(record: PendingL1TransactionRecord): Error {
    return new Error(record.lastError ?? "L1 transaction failed");
  }

  public async waitFor(
    txId: string,
    desiredStatus: WaitableTxStatus,
    options: WaitForTxOptions = {}
  ): Promise<void> {
    const initial = await this.pendingStorage.findById(txId);
    if (!initial) {
      log.warn(
        `TxStatusWaiter: waitFor(${desiredStatus}) unknown txId=${txId}`
      );
      throw new Error(`Unknown pending L1 transaction id ${txId}`);
    }
    if (initial.status === "failed") {
      throw TxStatusWaiter.toError(initial);
    }
    if (TxStatusWaiter.isSatisfied(initial, desiredStatus)) {
      return;
    }

    const emitter = this.getEmitter(txId);
    const eventPromise = new Promise<void>((resolve, reject) => {
      emitter.on(desiredStatus, () => {
        log.info(
          `TxStatusWaiter: waitFor(${desiredStatus}) resolved by event txId=${txId}`
        );
        resolve();
      });
      emitter.on("failed", ({ error }) => {
        log.warn(
          `TxStatusWaiter: waitFor(${desiredStatus}) rejected by failed event txId=${txId}`,
          error
        );
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });

    if (options.timeoutMs !== undefined) {
      const timeoutPromise = new Promise<void>((_, reject) => {
        const t = setTimeout(() => {
          reject(
            new Error(
              `Timeout waiting for ${txId} to reach status ${desiredStatus}`
            )
          );
        }, options.timeoutMs);
        t.unref?.();
      });
      await Promise.race([eventPromise, timeoutPromise]);
    } else {
      await eventPromise;
    }
  }
}
