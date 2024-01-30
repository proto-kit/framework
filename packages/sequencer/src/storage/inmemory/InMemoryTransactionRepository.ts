import { inject, injectable } from "tsyringe";
import { Field } from "o1js";

import { PendingTransaction } from "../../mempool/PendingTransaction";
import { TransactionRepository } from "../repositories/TransactionRepository";

import { InMemoryBlockStorage } from "./InMemoryBlockStorage";
import { InMemoryBatchStorage } from "./InMemoryBatchStorage";

@injectable()
export class InMemoryTransactionRepository implements TransactionRepository {
  public constructor(
    @inject("UnprovenBlockStorage")
    private readonly blockStorage: InMemoryBlockStorage,
    @inject("BlockStorage") private readonly batchStorage: InMemoryBatchStorage
  ) {}

  private async findBatch(block: string): Promise<number | undefined> {
    const tipHeight = await this.batchStorage.getCurrentBlockHeight();

    for (let height = tipHeight - 1; height >= 0; height--) {
      const batch = await this.batchStorage.getBlockAt(height);
      if (batch === undefined) {
        return undefined;
      }
      if (batch.bundles.includes(block)) {
        return height;
      }
    }
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
      const block = await this.blockStorage.getBlockAt(height);
      if (block === undefined) {
        return undefined;
      }
      const tx = block.transactions.find((tx) =>
        tx.tx.hash().equals(hashField).toBoolean()
      );
      if (tx !== undefined) {
        const batch = await this.findBatch(block.hash.toString());
        return {
          transaction: tx.tx,
          block: block.transactionsHash.toString(),
          batch,
        };
      }
    }
    return undefined;
  }
}
