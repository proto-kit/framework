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

  private getKey(sender: string, nonce: number): string {
    return `${sender}:${nonce}`;
  }

  public async queue(record: Omit<PendingL1TransactionRecord, "status">): Promise<void> {
    const key = this.getKey(record.sender, record.nonce);
    this.store.set(key, {
      ...record,
      status: "queued",
    });
  }

  public async update(
    sender: string,
    nonce: number,
    updates: Partial<Omit<PendingL1TransactionRecord, "sender" | "nonce">>
  ): Promise<void> {
    const key = this.getKey(sender, nonce);
    const existing = this.store.get(key);
    if (existing === undefined) {
      return;
    }
    this.store.set(key, {
      ...existing,
      ...updates,
    });
  }

  public async delete(sender: string, nonce: number): Promise<void> {
    const key = this.getKey(sender, nonce);
    this.store.delete(key);
  }

  public async findBySenderAndNonce(
    sender: string,
    nonce: number
  ): Promise<PendingL1TransactionRecord | undefined> {
    const key = this.getKey(sender, nonce);
    return this.store.get(key);
  }

  public async findByStatuses(statuses: PendingL1TransactionStatus[]): Promise<PendingL1TransactionRecord[]> {
    return Array.from(this.store.values()).filter((record) =>
      statuses.includes(record.status)
    );
  }
}
