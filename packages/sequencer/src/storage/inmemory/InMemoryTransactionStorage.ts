import { inject, injectable } from "tsyringe";

import { TransactionStorage } from "../repositories/TransactionStorage";
import { PendingTransaction } from "../../mempool/PendingTransaction";
import { BlockStorage } from "../repositories/BlockStorage";

import { InMemoryBatchStorage } from "./InMemoryBatchStorage";

@injectable()
export class InMemoryTransactionStorage implements TransactionStorage {
  private queue: PendingTransaction[] = [];

  private latestScannedBlock = -1;

  public constructor(
    @inject("BlockStorage")
    private readonly blockStorage: BlockStorage,
    @inject("BatchStorage") private readonly batchStorage: InMemoryBatchStorage
  ) {}

  public async removeTx(hashes: string[]) {
    const hashSet = new Set(hashes);
    this.queue = this.queue.filter((tx) => {
      const hash = tx.hash().toString();
      return !hashSet.has(hash);
    });
  }

  public async getPendingUserTransactions(): Promise<PendingTransaction[]> {
    const nextHeight = await this.blockStorage.getCurrentBlockHeight();
    for (
      let height = this.latestScannedBlock + 1;
      height < nextHeight;
      height++
    ) {
      // eslint-disable-next-line no-await-in-loop
      const block = await this.blockStorage.getBlockAt(height);
      if (block !== undefined) {
        const hashes = block.transactions.map((tx) => tx.tx.hash);
        this.queue = this.queue.filter(
          (tx) => !hashes.includes(tx.hash().toString())
        );
      }
    }
    this.latestScannedBlock = nextHeight - 1;

    return this.queue.slice();
  }

  public async pushUserTransaction(tx: PendingTransaction): Promise<boolean> {
    const notInQueue =
      this.queue.find(
        (tx2) => tx2.hash().toString() === tx.hash().toString()
      ) === undefined;
    if (notInQueue) {
      this.queue.push(tx);
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
    const pending = await this.getPendingUserTransactions();
    const pendingResult = pending.find((tx) => tx.hash().toString() === hash);
    if (pendingResult !== undefined) {
      return {
        transaction: pendingResult,
      };
    }

    const tipHeight = await this.blockStorage.getCurrentBlockHeight();

    for (let height = tipHeight - 1; height >= 0; height--) {
      // eslint-disable-next-line no-await-in-loop
      const block = await this.blockStorage.getBlockAt(height);
      if (block === undefined) {
        return undefined;
      }
      const txResult = block.transactions.find((tx) =>
        tx.tx.hash === hash
      );
      if (txResult !== undefined) {
        // eslint-disable-next-line no-await-in-loop
        const batch = await this.findBatch(block.hash);
        return {
          transaction: PendingTransaction.fromJSON(txResult.tx),
          block: block.transactionsHash,
          batch,
        };
      }
    }
    return undefined;
  }
}
