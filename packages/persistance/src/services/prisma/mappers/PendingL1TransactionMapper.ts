import {
  PendingL1Transaction,
  Prisma,
} from "@prisma/client";
import { PendingL1TransactionRecord, PendingL1TransactionStatus } from "@proto-kit/sequencer";
import { Mina } from "o1js";

export class PendingL1TransactionMapper {
  public mapOut(input: PendingL1Transaction): PendingL1TransactionRecord {
    return {
      id: input.id,
      sender: input.sender,
      nonce: input.nonce,
      attempts: input.attempts,
      status: input.status as PendingL1TransactionStatus,
      transaction: Mina.Transaction.fromJSON(input.transaction as string),
      lastError: input.lastError ?? undefined,
      sentAt: input.sentAt ? new Date(input.sentAt) : undefined,
    };
  }

  public mapIn(
    input: PendingL1TransactionRecord
  ): Prisma.PendingL1TransactionCreateInput {
    return {
      id: input.id,
      sender: input.sender,
      nonce: input.nonce,
      attempts: input.attempts,
      status: input.status,
      transaction: input.transaction.toJSON(),
      lastError: input.lastError ?? null,
      sentAt: input.sentAt ? input.sentAt.toJSON() : null,
    };
  }
}
