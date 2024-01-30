import { inject, injectable } from "tsyringe";
import {
  PendingTransaction,
  TransactionRepository,
} from "@proto-kit/sequencer";

import type { PrismaDatabaseConnection } from "../../PrismaDatabaseConnection";

import { TransactionMapper } from "./mappers/TransactionMapper";

@injectable()
export class PrismaTransactionRepository implements TransactionRepository {
  public constructor(
    @inject("Database") private readonly database: PrismaDatabaseConnection,
    private readonly transactionMapper: TransactionMapper
  ) {}

  public async findTransaction(hash: string): Promise<
    | {
        transaction: PendingTransaction;
        block?: string;
        batch?: number;
      }
    | undefined
  > {
    const tx = await this.database.client.transaction.findFirst({
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
