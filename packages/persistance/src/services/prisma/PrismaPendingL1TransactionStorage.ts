import { inject, injectable } from "tsyringe";
import { Prisma } from "@prisma/client";
import {
  PendingL1TransactionRecord,
  PendingL1TransactionStatus,
  PendingL1TransactionStorage,
} from "@proto-kit/sequencer";

import type { PrismaConnection } from "../../PrismaDatabaseConnection";
import { PendingL1TransactionMapper } from "./mappers/PendingL1TransactionMapper";

@injectable()
export class PrismaPendingL1TransactionStorage
  implements PendingL1TransactionStorage
{
  private readonly mapper = new PendingL1TransactionMapper();

  public constructor(
    @inject("Database") private readonly connection: PrismaConnection
  ) {}

  public async queue(record: Omit<PendingL1TransactionRecord, "status">): Promise<void> {
    const { prismaClient } = this.connection;
    const status:PendingL1TransactionStatus = "queued";
    await prismaClient.pendingL1Transaction.create({
      data: {
        sender: record.sender,
        nonce: record.nonce,
        attempts: record.attempts,
        status: status,
        transaction: record.transaction.toJSON(),
        lastError: record.lastError ?? null,
        sentAt: record.sentAt,
      },
    });
  }

  public async update(
    sender: string,
    nonce: number,
    updates: Partial<Omit<PendingL1TransactionRecord, "sender" | "nonce">>
  ): Promise<void> {
    const { prismaClient } = this.connection;
    await prismaClient.pendingL1Transaction.update({
      where: {
        sender_nonce: {
          sender,
          nonce,
        },
      },
      data: {
        ...(updates.attempts !== undefined && { attempts: updates.attempts }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.transaction !== undefined && { transaction: updates.transaction.toJSON() }),
        ...(updates.lastError !== undefined && { lastError: updates.lastError }),
        ...(updates.sentAt !== undefined && { sentAt: updates.sentAt }),
      },
    });
  }

  public async delete(sender: string, nonce: number): Promise<void> {
    const { prismaClient } = this.connection;
    await prismaClient.pendingL1Transaction.delete({
      where: {
        sender_nonce: {
          sender,
          nonce,
        },
      },
    });
  }

  public async findBySenderAndNonce(
    sender: string,
    nonce: number
  ): Promise<PendingL1TransactionRecord | undefined> {
    const { prismaClient } = this.connection;
    const record = await prismaClient.pendingL1Transaction.findUnique({
      where: {
        sender_nonce: {
          sender,
          nonce,
        },
      },
    });
    if (!record) {
      return undefined;
    }
    return this.mapper.mapOut(record);
  }

  public async findByStatuses(statuses: PendingL1TransactionStatus[]): Promise<PendingL1TransactionRecord[]> {
    const { prismaClient } = this.connection;
    const rows = await prismaClient.pendingL1Transaction.findMany({
      where: {
        status: {
          in: statuses,
        },
      },
    });
    return rows.map((record) => this.mapper.mapOut(record));
  }
}
