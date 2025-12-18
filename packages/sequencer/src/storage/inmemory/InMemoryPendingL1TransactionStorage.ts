import {
  PendingL1TransactionRecord,
  PendingL1TransactionStatus,
  PendingL1TransactionStorage,
} from "../repositories/PendingL1TransactionStorage";

export class InMemoryPendingL1TransactionStorage
  implements PendingL1TransactionStorage
{
  // Key: sender:nonce
  private store = new Map<string, PendingL1TransactionRecord>();


  public async queue(record: Omit<PendingL1TransactionRecord, "status">): Promise<string> {
    const key = Math.random().toString(36).substring(2, 15);
    this.store.set(key, {
      ...record,
      id: key,
      status: "queued",
    });
    return key;
  }

  public async update(
    id: string,
    updates: Partial<Omit<PendingL1TransactionRecord, "id">>
  ): Promise<void> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return;
    }
    this.store.set(id, {
      ...existing,
      ...updates,
    });
  }

  public async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  public async findById(id: string): Promise<PendingL1TransactionRecord | undefined> {
    return this.store.get(id);
  }

  public async findByStatuses(statuses: PendingL1TransactionStatus[]): Promise<PendingL1TransactionRecord[]> {
    return Array.from(this.store.values()).filter((record) =>
      statuses.includes(record.status)
    );
  }
}
