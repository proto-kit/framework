import {
  MessageStorage,
  PendingTransactionJSONType,
} from "@proto-kit/sequencer";
import { inject, injectable } from "tsyringe";

import type { PrismaConnection } from "../../PrismaDatabaseConnection";

import { TransactionMapper } from "./mappers/TransactionMapper";

@injectable()
export class PrismaMessageStorage implements MessageStorage {
  public constructor(
    @inject("Database") private readonly connection: PrismaConnection,
    private readonly transactionMapper: TransactionMapper
  ) {}

  public async getMessageBatches(
    fromMessagesHash: string,
    toMessagesHash: string
  ) {
    // TODO Make efficient

    const batches: {
      fromMessagesHash: string;
      toMessagesHash: string;
      messages: PendingTransactionJSONType[];
    }[] = [];
    let currentHash = fromMessagesHash;

    while (currentHash !== toMessagesHash) {
      // eslint-disable-next-line no-await-in-loop
      const batch = await this.getNextMessagesBatch(currentHash);

      if (batch === undefined) {
        return batches;
      }

      batches.push(batch);
      currentHash = batch.toMessagesHash;
    }
    return batches;
  }

  public async getNextMessagesBatch(fromMessageHash: string): Promise<
    | {
        fromMessagesHash: string;
        toMessagesHash: string;
        messages: PendingTransactionJSONType[];
      }
    | undefined
  > {
    const { prismaClient } = this.connection;

    const batch = await prismaClient.incomingMessageBatch.findFirst({
      where: {
        fromMessageHash,
      },
      include: {
        messages: {
          include: {
            transaction: true,
          },
        },
      },
    });

    if (batch === null) {
      return undefined;
    }

    const dbTransactions = batch.messages.map((message) => {
      return message.transaction;
    });

    const messages = dbTransactions.map((dbTx) =>
      this.transactionMapper.mapIn(dbTx)
    );

    return {
      fromMessagesHash: fromMessageHash,
      toMessagesHash: batch.toMessageHash,
      messages,
    };
  }

  public async pushMessages(
    fromMessageHash: string,
    toMessageHash: string,
    messages: PendingTransactionJSONType[]
  ): Promise<void> {
    const transactions = messages.map((message) =>
      this.transactionMapper.mapOut(message)
    );

    const { prismaClient } = this.connection;

    await prismaClient.transaction.createMany({
      data: transactions,
      skipDuplicates: true,
    });

    await prismaClient.incomingMessageBatch.create({
      data: {
        fromMessageHash,
        toMessageHash,
        messages: {
          createMany: {
            data: transactions.map((transaction) => ({
              transactionHash: transaction.hash,
            })),
          },
        },
      },
    });
  }
}
