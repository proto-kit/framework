import { Transaction } from "o1js";

export type PendingL1TransactionStatus =
  | "queued"
  | "sent"
  | "included"
  | "failed";

export interface PendingL1TransactionRecord {
  sender: string;
  nonce: number;
  attempts: number;
  status: PendingL1TransactionStatus;
  transaction: Transaction<any, any>;
  lastError?: string;
  sentAt?: Date;
}

export interface PendingL1TransactionStorage {
  queue(record: Omit<PendingL1TransactionRecord, "status">): Promise<void>;

  update(
    sender: string,
    nonce: number,
    updates: Partial<Omit<PendingL1TransactionRecord, "sender" | "nonce">>
  ): Promise<void>;

  delete(sender: string, nonce: number): Promise<void>;

  findBySenderAndNonce(
    sender: string,
    nonce: number
  ): Promise<PendingL1TransactionRecord | undefined>;

  findByStatuses(statuses: PendingL1TransactionStatus[]): Promise<PendingL1TransactionRecord[]>;
}
