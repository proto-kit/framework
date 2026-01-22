import { PendingL1Transaction, Prisma } from "@prisma/client";
import {
  PendingL1TransactionRecord,
  PendingL1TransactionStatus,
} from "@proto-kit/sequencer";
import { Mina } from "o1js";

export class PendingL1TransactionMapper {
  public mapIn(input: PendingL1Transaction): PendingL1TransactionRecord {
    return {
      id: input.id,
      sender: input.sender,
      nonce: input.nonce,
      attempts: input.attempts,
      status: input.status as PendingL1TransactionStatus,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      transaction: Mina.Transaction.fromJSON(input.transaction as any),
      lastError: input.lastError ?? undefined,
      sentAt: input.sentAt ?? undefined,
      queuedAt: input.queuedAt ?? undefined,
      nextActionAt: input.nextActionAt ?? undefined,
    };
  }

  public mapOut(
    input: Omit<PendingL1TransactionRecord, "id"> & { id?: string }
  ): Prisma.PendingL1TransactionCreateInput {
    return {
      id: input.id ?? undefined,
      sender: input.sender,
      nonce: input.nonce,
      attempts: input.attempts,
      status: input.status,
      transaction: input.transaction.toJSON(),
      lastError: input.lastError ?? null,
      sentAt: input.sentAt ?? null,
      queuedAt: input.queuedAt ?? null,
      nextActionAt: input.nextActionAt ?? null,
    };
  }
}
