import { inject, injectable } from "tsyringe";
import { PendingTransaction, TransactionStorage } from "@proto-kit/sequencer";

import type { PrismaConnection } from "../../PrismaDatabaseConnection";

import { TransactionMapper } from "./mappers/TransactionMapper";

@injectable()
export class PrismaTransactionStorage implements TransactionStorage {
  public constructor(
    @inject("Database") private readonly connection: PrismaConnection,
    private readonly transactionMapper: TransactionMapper
  ) {}

  public async getPendingUserTransactions(): Promise<PendingTransaction[]> {
    const { prismaClient } = this.connection;

    const txs = await prismaClient.transaction.findMany({
      where: {
        executionResult: {
          is: null
        },
        isMessage: {
          equals: false
        }
      },
    })
    return txs.map(tx => this.transactionMapper.mapIn(tx));
  }

  public async pushUserTransaction(tx: PendingTransaction): Promise<boolean> {
    const { prismaClient } = this.connection;

    const result = await prismaClient.transaction.createMany({
      data: [this.transactionMapper.mapOut(tx)],
      skipDuplicates: true,
    });

    return result.count === 1;
  }
}
