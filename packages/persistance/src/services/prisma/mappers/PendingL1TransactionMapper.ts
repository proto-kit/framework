import {
  PendingL1Transaction,
  Prisma,
} from "@prisma/client";
import { PendingL1TransactionRecord, PendingL1TransactionStatus } from "@proto-kit/sequencer";

export class PendingL1TransactionMapper {
  public mapOut(input: PendingL1Transaction): PendingL1TransactionRecord {
    return {
      sender: input.sender,
      nonce: input.nonce,
      attempts: input.attempts,
      status: input.status as PendingL1TransactionStatus,
      transactionJson: JSON.stringify(input.transaction),
      lastError: input.lastError ?? undefined,
      sentAt: input.sentAt ? new Date(input.sentAt) : undefined,
    };
  }

  public mapIn(
    input: PendingL1TransactionRecord
  ): Prisma.PendingL1TransactionCreateInput {
    return {
      sender: input.sender,
      nonce: input.nonce,
      attempts: input.attempts,
      status: input.status,
      transaction: JSON.parse(input.transactionJson),
      lastError: input.lastError ?? null,
      sentAt: input.sentAt ? input.sentAt.toJSON() : null,
    };
  }
}
