import { inject, injectable } from "tsyringe";
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

  public async queue(
    record: Omit<PendingL1TransactionRecord, "status" | "id">
  ): Promise<string> {
    const { prismaClient } = this.connection;
    const status: PendingL1TransactionStatus = "queued";
    const txnRecord = await prismaClient.pendingL1Transaction.create({
      data: this.mapper.mapOut({ ...record, status }),
    });
    return txnRecord.id;
  }

  public async update(
    id: string,
    updates: Partial<Omit<PendingL1TransactionRecord, "id">>
  ): Promise<void> {
    const { prismaClient } = this.connection;
    await prismaClient.pendingL1Transaction.update({
      where: { id },
      data: {
        ...(updates.attempts !== undefined && { attempts: updates.attempts }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.transaction !== undefined && {
          transaction: updates.transaction.toJSON(),
        }),
        ...(updates.hash !== undefined && { hash: updates.hash }),
        ...(updates.lastError !== undefined && {
          lastError: updates.lastError,
        }),
        ...(updates.sentAt !== undefined && { sentAt: updates.sentAt }),
        ...(updates.queuedAt !== undefined && { queuedAt: updates.queuedAt }),
        ...(updates.nextActionAt !== undefined && {
          nextActionAt: updates.nextActionAt,
        }),
      },
    });
  }

  public async delete(id: string): Promise<void> {
    const { prismaClient } = this.connection;
    await prismaClient.pendingL1Transaction.delete({
      where: {
        id,
      },
    });
  }

  public async findById(
    id: string
  ): Promise<PendingL1TransactionRecord | undefined> {
    const { prismaClient } = this.connection;
    const record = await prismaClient.pendingL1Transaction.findUnique({
      where: {
        id,
      },
    });
    if (!record) {
      return undefined;
    }
    return this.mapper.mapIn(record);
  }

  public async findByStatuses(
    statuses: PendingL1TransactionStatus[]
  ): Promise<PendingL1TransactionRecord[]> {
    const { prismaClient } = this.connection;
    const rows = await prismaClient.pendingL1Transaction.findMany({
      where: {
        status: {
          in: statuses,
        },
      },
    });
    return rows.map((record) => this.mapper.mapIn(record));
  }
}
