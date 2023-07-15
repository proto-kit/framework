import {
  AsyncMerkleTreeStore,
  InMemoryMerkleTreeStorage,
  noop, StateTransitionWitnessProvider
} from "@yab/protocol";

import {
  dependency,
  DependencyFactory,
  dependencyFactory,
} from "../sequencer/builder/DependencyFactory";
import { AsyncStateService } from "../protocol/production/state/AsyncStateService";
import { CachedStateService } from "../protocol/production/execution/CachedStateService";

import { StorageDependencyFactory } from "./StorageDependencyFactory";
import { BlockStorage } from "./repositories/BlockStorage";

class MockAsyncMerkleTreeStore implements AsyncMerkleTreeStore {
  private readonly store = new InMemoryMerkleTreeStorage();

  public commit(): void {
    noop();
  }

  public openTransaction(): void {
    noop();
  }

  public async getNode(
    key: bigint,
    level: number
  ): Promise<bigint | undefined> {
    return this.store.getNode(key, level);
  }

  public async setNode(
    key: bigint,
    level: number,
    value: bigint
  ): Promise<void> {
    this.store.setNode(key, level, value);
  }
}

class MockBlockStorage implements BlockStorage {
  public async getCurrentBlockHeight(): Promise<number> {
    return 0;
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
