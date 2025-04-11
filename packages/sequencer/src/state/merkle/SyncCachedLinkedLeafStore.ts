import {
  LinkedLeaf,
  InMemoryLinkedLeafStore,
  LinkedLeafStore,
  StoredLeaf,
  BigIntMath,
} from "@proto-kit/common";

import { CachedLinkedLeafStore } from "../lmt/CachedLinkedLeafStore";
import { SyncCachedMerkleTreeStore } from "./SyncCachedMerkleTreeStore";

// This is mainly used for supporting the rollbacks we need to do in case a runtimemethod fails
// In this case everything should be preloaded in the parent async service
export class SyncCachedLinkedLeafStore implements LinkedLeafStore {
  private readonly leafStore = new InMemoryLinkedLeafStore();

  private readonly treeCache: SyncCachedMerkleTreeStore;

  public constructor(private readonly parent: CachedLinkedLeafStore) {
    this.treeCache = new SyncCachedMerkleTreeStore(parent.treeStore);
    this.leafStore.maximumIndex = parent.getMaximumIndex();
  }

  public get treeStore() {
    return this.treeCache;
  }

  public getLeaf(path: bigint): StoredLeaf | undefined {
    return this.leafStore.getLeaf(path) ?? this.parent.getLeaf(path);
  }

  public setLeaf(index: bigint, value: LinkedLeaf) {
    this.leafStore.setLeaf(index, value);
  }

  public getMaximumIndex(): bigint | undefined {
    return (
      this.leafStore.getMaximumIndex() ?? this.parent.getMaximumIndex() ?? 0n
    );
  }

  public getLeafLessOrEqual(path: bigint): StoredLeaf | undefined {
    return (
      this.leafStore.getLeafLessOrEqual(path) ??
      this.parent.getLeafLessOrEqual(path)
    );
  }

  public async preloadKeys(path: bigint[]) {
    await this.parent.preloadKeys(path);
  }

  public mergeIntoParent() {
    if (Object.keys(this.leafStore.leaves).length === 0) {
      return;
    }

    Object.values(this.leafStore.leaves).forEach(({ leaf, index }) =>
      this.parent.setLeaf(index, leaf)
    );

    this.leafStore.leaves = {};

    this.treeCache.mergeIntoParent();
  }
}
