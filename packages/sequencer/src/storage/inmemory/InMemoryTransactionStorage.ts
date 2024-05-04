import { inject, injectable } from "tsyringe";
import { Field } from "o1js";

import { TransactionStorage } from "../repositories/TransactionStorage";
import { PendingTransaction } from "../../mempool/PendingTransaction";
import {
  HistoricalUnprovenBlockStorage,
  UnprovenBlockStorage,
} from "../repositories/UnprovenBlockStorage";

import { InMemoryBatchStorage } from "./InMemoryBatchStorage";

@injectable()
export class InMemoryTransactionStorage implements TransactionStorage {
  private queue: PendingTransaction[] = [];

  private latestScannedBlock = -1;

  public constructor(
    @inject("UnprovenBlockStorage")
    private readonly blockStorage: UnprovenBlockStorage &
      HistoricalUnprovenBlockStorage,
    @inject("BlockStorage") private readonly batchStorage: InMemoryBatchStorage
  ) {}

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
        const hashes = block.transactions.map((tx) => tx.tx.hash().toString());
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

  public async removeUserTransaction(hash: string) {
    const index = this.queue.findIndex((tx) => tx.hash().toString() === hash);
    if (index > -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  private async findBatch(block: string): Promise<number | undefined> {
    const tipHeight = await this.batchStorage.getCurrentBlockHeight();

    for (let height = tipHeight - 1; height >= 0; height--) {
      // eslint-disable-next-line no-await-in-loop
      const batch = await this.batchStorage.getBlockAt(height);
      if (batch === undefined) {
        return undefined;
      }
      if (batch.bundles.includes(block)) {
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
}
