import { inject, injectable } from "tsyringe";
import { Field } from "o1js";
import { splitArray } from "@proto-kit/common";

import { TransactionStorage } from "../repositories/TransactionStorage";
import { PendingTransaction } from "../../mempool/PendingTransaction";
import { BlockStorage } from "../repositories/BlockStorage";
import { PathResolution } from "../../protocol/production/sequencing/Ordering";

import { InMemoryBatchStorage } from "./InMemoryBatchStorage";

@injectable()
export class InMemoryTransactionStorage implements TransactionStorage {
  private queue: { tx: PendingTransaction; sortingValue: number }[] = [];

  private latestScannedBlock = -1;

  public constructor(
    @inject("BlockStorage")
    private readonly blockStorage: BlockStorage,
    @inject("BatchStorage") private readonly batchStorage: InMemoryBatchStorage
  ) {}

  public async removeTx(hashes: string[]) {
    const hashSet = new Set(hashes);
    this.queue = this.queue.filter(({ tx }) => {
      const hash = tx.hash().toString();
      return !hashSet.has(hash);
    });
  }

  private sortQueue() {
    // Sort in-place and descending
    this.queue.sort(({ sortingValue: a }, { sortingValue: b }) => b - a);
  }

  public async getPendingUserTransactions(
    offset: number,
    limit?: number
  ): Promise<PendingTransaction[]> {
    const nextHeight = await this.blockStorage.getCurrentBlockHeight();
    for (
      let height = this.latestScannedBlock + 1;
      height < nextHeight;
      height++
    ) {
      // eslint-disable-next-line no-await-in-loop
      const block = await this.blockStorage.getBlockAt(height);
      if (block !== undefined) {
        const hashes = block.transactions.map((tx) => tx.tx.hash().toString());
        this.queue = this.queue.filter(
          ({ tx }) => !hashes.includes(tx.hash().toString())
        );
      }
    }
    this.latestScannedBlock = nextHeight - 1;

    this.sortQueue();

    const from = offset ?? 0;
    const to =
      limit !== undefined
        ? Math.min(from + limit, this.queue.length)
        : undefined;

    return this.queue.slice(from, to).map(({ tx }) => tx);
  }

  public async pushUserTransaction(
    tx: PendingTransaction,
    priority: number
  ): Promise<boolean> {
    const notInQueue =
      this.queue.find(
        ({ tx: tx2 }) => tx2.hash().toString() === tx.hash().toString()
      ) === undefined;
    if (notInQueue) {
      this.queue.push({ tx, sortingValue: priority });
    }
    return notInQueue;
  }

  private async findBatch(block: string): Promise<number | undefined> {
    const tipHeight = await this.batchStorage.getCurrentBatchHeight();

    for (let height = tipHeight - 1; height >= 0; height--) {
      // eslint-disable-next-line no-await-in-loop
      const batch = await this.batchStorage.getBatchAt(height);
      if (batch === undefined) {
        return undefined;
      }
      if (batch.blockHashes.includes(block)) {
        return height;
      }
    }
    return undefined;
  }

  public async findTransaction(hash: string): Promise<
    | {
        transaction: PendingTransaction;
        block?: string;
        batch?: number;
      }
    | undefined
  > {
    const pending = await this.getPendingUserTransactions(0);
    const pendingResult = pending.find((tx) => tx.hash().toString() === hash);
    if (pendingResult !== undefined) {
      return {
        transaction: pendingResult,
      };
    }

    const tipHeight = await this.blockStorage.getCurrentBlockHeight();
    const hashField = Field(hash);

    for (let height = tipHeight - 1; height >= 0; height--) {
      // eslint-disable-next-line no-await-in-loop
      const block = await this.blockStorage.getBlockAt(height);
      if (block === undefined) {
        return undefined;
      }
      const txResult = block.transactions.find((tx) =>
        tx.tx.hash().equals(hashField).toBoolean()
      );
      if (txResult !== undefined) {
        // eslint-disable-next-line no-await-in-loop
        const batch = await this.findBatch(block.hash.toString());
        return {
          transaction: txResult.tx,
          block: block.transactionsHash.toString(),
          batch,
        };
      }
    }
    return undefined;
  }

  private pathResolution = new PathResolution<string>();

  private unresolvedSet: { tx: PendingTransaction; sortingValue: number }[] =
    [];

  public async reportSkippedTransactions(
    paths: Record<string, bigint[]>
  ): Promise<void> {
    Object.entries(paths).forEach(([txHash, paths]) => {
      this.pathResolution.pushPaths(txHash, paths);
    });

    // Remove all unresolved txs from queue and append them to the unresolvedSet
    const unresolvedHashes = Object.keys(paths);
    const split = splitArray(this.queue, (x) =>
      unresolvedHashes.includes(x.tx.hash().toString()) ? "unresolved" : "queue"
    );
    this.queue = split.queue ?? [];
    this.unresolvedSet.push(...(split.unresolved ?? []));
  }

  public async reportChangedPaths(paths: bigint[]): Promise<void> {
    const resolved = this.pathResolution.resolvePaths(paths);

    // Move resolved from unresolvedSet to queue, then sort queue
    const resolvedSplit = splitArray(this.unresolvedSet, (x) =>
      resolved.includes(x.tx.hash().toString()) ? "resolved" : "unresolved"
    );
    this.queue.push(...(resolvedSplit.resolved ?? []));
    this.unresolvedSet = resolvedSplit.unresolved ?? [];

    this.sortQueue();
  }
}
