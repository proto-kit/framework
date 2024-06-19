import { inject, injectable } from "tsyringe";

import {
  ComputedBlockTransactionWithBlockHash,
  TransactionFilter,
  TransactionPagination,
  TransactionStorage,
} from "../repositories/TransactionStorage";
import { PaginatedResult } from "../repositories/UnprovenBlockStorage";

import { InMemoryUnprovenBlockStorage } from "./InMemoryUnprovenBlockStorage";

@injectable()
export class InMemoryTransactionStorage implements TransactionStorage {
  public constructor(
    @inject("UnprovenBlockStorage")
    private unprovenBlockStorage: InMemoryUnprovenBlockStorage
  ) {}

  public async getTransactions(
    pagination: TransactionPagination,
    filter?: TransactionFilter | undefined
  ): Promise<PaginatedResult<ComputedBlockTransactionWithBlockHash>> {
    let transactions = this.unprovenBlockStorage.blocks
      .map(({ block }) => [block, block.transactions] as const)
      // eslint-disable-next-line @typescript-eslint/no-shadow
      .flatMap(([block, transactions]) =>
        transactions.map((tx) => ({
          ...tx,
          status: tx.status.toBoolean(),
          blockHash: block.hash.toString(),
        }))
      );

    if (filter?.hash !== undefined) {
      transactions = transactions.filter((result) => {
        return result.tx.hash().toString() === filter.hash;
      });
    }

    if (filter?.status !== undefined) {
      transactions = transactions.filter(
        (result) => result.status === filter.status
      );
    }

    if (filter?.methodId !== undefined) {
      transactions = transactions.filter(
        (result) => result.tx.methodId.toString() === filter.methodId
      );
    }

    if (filter?.sender !== undefined) {
      transactions = transactions.filter(
        (result) => result.tx.sender.toBase58() === filter.sender
      );
    }

    const totalCount = transactions.length;

    const start = pagination.skip ?? 0;
    const end = (pagination.skip ?? 0) + pagination.take;

    const items = transactions.slice(start, end);

    return {
      items,
      totalCount,
    };
  }
}
