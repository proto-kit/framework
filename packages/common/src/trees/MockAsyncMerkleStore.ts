import { noop } from "../utils";

import { InMemoryMerkleTreeStorage } from "./InMemoryMerkleTreeStorage";

export class MockAsyncMerkleTreeStore {
  public readonly store = new InMemoryMerkleTreeStorage();

  public commit(): void {
    noop();
  }

  public openTransaction(): void {
    noop();
  }

  public async getNodeAsync(
    key: bigint,
    level: number
  ): Promise<bigint | undefined> {
    return this.store.getNode(key, level);
  }

  public async setNodeAsync(
    key: bigint,
    level: number,
    value: bigint
  ): Promise<void> {
    this.store.setNode(key, level, value);
  }
}
