import {
  AsyncMerkleTreeStore,
  InMemoryMerkleTreeStorage,
} from "@proto-kit/protocol";
import {
  dependency,
  DependencyFactory,
  dependencyFactory,
  noop,
} from "@proto-kit/common";

import { AsyncStateService } from "../protocol/production/state/AsyncStateService";
import { CachedStateService } from "../protocol/production/execution/CachedStateService";

import { StorageDependencyFactory } from "./StorageDependencyFactory";
import { BlockStorage, HistoricalBlockStorage } from "./repositories/BlockStorage";
import { ComputedBlock } from "./model/Block";

export class MockAsyncMerkleTreeStore implements AsyncMerkleTreeStore {
  private readonly store = new InMemoryMerkleTreeStorage();

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

class MockBlockStorage implements BlockStorage, HistoricalBlockStorage {
  private readonly blocks: ComputedBlock[] = [];

  public async getCurrentBlockHeight(): Promise<number> {
    return this.blocks.length;
  }

  public async getBlockAt(height: number): Promise<ComputedBlock | undefined> {
    return this.blocks.at(height);
  }

  public async pushBlock(block: ComputedBlock): Promise<void> {
    this.blocks.push(block);
  }
}

@dependencyFactory()
export class MockStorageDependencyFactory
  extends DependencyFactory
  implements StorageDependencyFactory
{
  @dependency()
  public asyncMerkleStore(): AsyncMerkleTreeStore {
    return new MockAsyncMerkleTreeStore();
  }

  @dependency()
  public asyncStateService(): AsyncStateService {
    return new CachedStateService(undefined);
  }

  @dependency()
  public blockStorage(): BlockStorage {
    return new MockBlockStorage();
  }
}
