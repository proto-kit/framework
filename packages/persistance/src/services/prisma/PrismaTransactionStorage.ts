import { inject, injectable } from "tsyringe";
import {
  PendingTransaction,
  trace,
  Tracer,
  TransactionStorage,
} from "@proto-kit/sequencer";

import type { PrismaConnection } from "../../PrismaDatabaseConnection";

import { TransactionMapper } from "./mappers/TransactionMapper";

@injectable()
export class PrismaTransactionStorage implements TransactionStorage {
  public constructor(
    @inject("Database") private readonly connection: PrismaConnection,
    private readonly transactionMapper: TransactionMapper,
    @inject("Tracer") public readonly tracer: Tracer
  ) {}

  @trace("db.txs.get")
  public async getPendingUserTransactions(): Promise<PendingTransaction[]> {
    const { prismaClient } = this.connection;

    const txs = await prismaClient.transaction.findMany({
      where: {
        executionResult: {
          is: null,
        },
        isMessage: {
          equals: false,
        },
      },
    });
    return txs.map((tx) => this.transactionMapper.mapIn(tx));
  }

  public async removeTx(hashes: string[], type: "included" | "dropped") {
    // In our schema, included txs are simply just linked with blocks, so we only
    // need to delete if we drop a tx
    if (type === "dropped") {
      const { prismaClient } = this.connection;

      await prismaClient.transaction.deleteMany({
        where: {
          hash: {
            in: hashes,
          },
        },
      });
    }
  }

  public async pushUserTransaction(tx: PendingTransaction): Promise<boolean> {
    const { prismaClient } = this.connection;

    const result = await prismaClient.transaction.createMany({
      data: [this.transactionMapper.mapOut(tx)],
      skipDuplicates: true,
    });

    return result.count === 1;
  }

  public async findTransaction(hash: string): Promise<
    | {
        transaction: PendingTransaction;
        block?: string;
        batch?: number;
      }
    | undefined
  > {
    const { prismaClient } = this.connection;

    const tx = await prismaClient.transaction.findFirst({
      where: {
        hash,
      },
      include: {
        executionResult: {
          include: {
            block: {
              include: {
                batch: true,
              },
            },
          },
        },
      },
    });

    if (tx === null) {
      return undefined;
    }

    const transaction = this.transactionMapper.mapIn(tx);
    const block = tx.executionResult?.block?.hash;
    const batch = tx.executionResult?.block?.batch?.height;

    return {
      transaction,
      block,
      batch,
    };
  }
}
