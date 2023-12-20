import {
  StateServiceProvider,
  StateTransitionWitnessProviderReference,
} from "@proto-kit/protocol";
import {
  dependency,
  DependencyFactory,
  dependencyFactory,
  noop,
  InMemoryMerkleTreeStorage,
} from "@proto-kit/common";

import { AsyncMerkleTreeStore } from "../state/async/AsyncMerkleTreeStore";
import { CachedStateService } from "../state/state/CachedStateService";
import { AsyncStateService } from "../state/async/AsyncStateService";
import {
  UnprovenBlock,
  UnprovenBlockMetadata,
} from "../protocol/production/unproven/TransactionExecutionService";
import { CachedMerkleTreeStore } from "../state/merkle/CachedMerkleTreeStore";
import { UnprovenBlockWithPreviousMetadata } from "../protocol/production/BlockProducerModule";

import { StorageDependencyFactory } from "./StorageDependencyFactory";
import {
  BlockStorage,
  HistoricalBlockStorage,
} from "./repositories/BlockStorage";
import { ComputedBlock } from "./model/Block";
import {
  HistoricalUnprovenBlockStorage,
  UnprovenBlockQueue,
  UnprovenBlockStorage,
} from "./repositories/UnprovenBlockStorage";

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

class MockUnprovenBlockStorage
  implements
    UnprovenBlockStorage,
    HistoricalUnprovenBlockStorage,
    UnprovenBlockQueue
{
  private readonly blocks: UnprovenBlock[] = [];

  private readonly metadata: UnprovenBlockMetadata[] = [];

  private cursor = 0;

  public async getBlockAt(height: number): Promise<UnprovenBlock | undefined> {
    return this.blocks.at(height);
  }

  public async getCurrentBlockHeight(): Promise<number> {
    return this.blocks.length;
  }

  public async getLatestBlock(): Promise<UnprovenBlock | undefined> {
    return await this.getBlockAt((await this.getCurrentBlockHeight()) - 1);
  }

  public async popNewBlocks(
    remove: boolean
  ): Promise<UnprovenBlockWithPreviousMetadata[]> {
    const slice = this.blocks.slice(this.cursor);

    // eslint-disable-next-line putout/putout
    let metadata: (UnprovenBlockMetadata | undefined)[] = this.metadata.slice(
      Math.max(this.cursor - 1, 0)
    );
    if (this.cursor === 0) {
      metadata = [undefined, ...metadata];
    }

    if (remove) {
      this.cursor = this.blocks.length;
    }
    return slice.map((block, index) => ({
      block,
      lastBlockMetadata: metadata[index],
    }));
  }

  public async pushBlock(block: UnprovenBlock): Promise<void> {
    this.blocks.push(block);
  }

  public async getNewestMetadata(): Promise<UnprovenBlockMetadata | undefined> {
    return this.metadata.length > 0 ? this.metadata.at(-1) : undefined;
  }

  public async pushMetadata(metadata: UnprovenBlockMetadata): Promise<void> {
    this.metadata.push(metadata);
  }
}

@dependencyFactory()
export class MockStorageDependencyFactory
  extends DependencyFactory
  implements StorageDependencyFactory
{
  private readonly asyncService = new CachedStateService(undefined);

  private readonly merkleStore = new MockAsyncMerkleTreeStore();

  private readonly blockStorageQueue = new MockUnprovenBlockStorage();

  @dependency()
  public asyncMerkleStore(): AsyncMerkleTreeStore {
    return this.merkleStore;
  }

  @dependency()
  public asyncStateService(): AsyncStateService {
    return this.asyncService;
  }

  @dependency()
  public blockStorage(): BlockStorage {
    return new MockBlockStorage();
  }

  @dependency()
  public unprovenBlockQueue(): UnprovenBlockQueue {
    return this.blockStorageQueue;
  }

  @dependency()
  public unprovenBlockStorage(): UnprovenBlockStorage {
    return this.blockStorageQueue;
  }

  @dependency()
  public stateServiceProvider(): StateServiceProvider {
    return new StateServiceProvider(this.asyncService);
  }

  @dependency()
  public stateTransitionWitnessProviderReference(): StateTransitionWitnessProviderReference {
    return new StateTransitionWitnessProviderReference();
  }

  @dependency()
  public unprovenStateService(): CachedStateService {
    return new CachedStateService(this.asyncService);
  }

  @dependency()
  public unprovenMerkleStore(): CachedMerkleTreeStore {
    return new CachedMerkleTreeStore(this.merkleStore);
  }
}
