import { Transaction } from "o1js";

export type PendingL1TransactionStatus =
  | "queued"
  | "sent"
  | "included"
  | "failed";

export interface PendingL1TransactionRecord {
  id: string;
  sender: string;
  nonce: number;
  attempts: number;
  status: PendingL1TransactionStatus;
  transaction: Transaction<any, any>;
  hash?: string;
  lastError?: string;
  sentAt?: Date;
}

export interface PendingL1TransactionStorage {
  queue(
    record: Omit<PendingL1TransactionRecord, "status" | "id">
  ): Promise<string>;

  update(
    id: string,
    updates: Partial<Omit<PendingL1TransactionRecord, "id">>
  ): Promise<void>;

  delete(id: string): Promise<void>;

  findById(id: string): Promise<PendingL1TransactionRecord | undefined>;

  findByStatuses(
    statuses: PendingL1TransactionStatus[]
  ): Promise<PendingL1TransactionRecord[]>;
}
