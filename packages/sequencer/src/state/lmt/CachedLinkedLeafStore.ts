import {
  InMemoryLinkedLeafStore,
  LinkedLeaf,
  mapSequential,
  LinkedLeafStore,
} from "@proto-kit/common";

import { AsyncLinkedLeafStore } from "../async/AsyncLinkedLeafStore";

import { CachedMerkleTreeStore } from "../merkle/CachedMerkleTreeStore";

export class CachedLinkedLeafStore implements LinkedLeafStore {
  private writeCache: {
    [key: string]: { leaf: LinkedLeaf; index: bigint };
  } = {};

  private readonly leafStore = new InMemoryLinkedLeafStore();

  private readonly treeCache: CachedMerkleTreeStore;

  private constructor(private readonly parent: AsyncLinkedLeafStore) {
    this.treeCache = new CachedMerkleTreeStore(parent.treeStore);
  }

  public get treeStore() {
    return this.treeCache;
  }

  public static async new(
    parent: AsyncLinkedLeafStore
  ): Promise<CachedLinkedLeafStore> {
    const cachedInstance = new CachedLinkedLeafStore(parent);
    await cachedInstance.preloadMaximumIndex();
    await cachedInstance.preloadZeroNode();
    return cachedInstance;
  }

  public getLeaf(path: bigint) {
    return this.leafStore.getLeaf(path);
  }

  // This gets the leaves and the nodes from the in memory store.
  // If the leaf is not in the in-memory store it goes to the parent (i.e.
  // what's put in the constructor).
  public async getLeavesAsync(paths: bigint[]) {
    const results = Array<{ leaf: LinkedLeaf; index: bigint } | undefined>(
      paths.length
    ).fill(undefined);

    const toFetch: bigint[] = [];

    paths.forEach((path, index) => {
      const localResult = this.getLeaf(path);
      if (localResult !== undefined) {
        results[index] = localResult;
      } else {
        toFetch.push(path);
      }
    });

    // Reverse here, so that we can use pop() later
    const fetchResult = (await this.parent.getLeavesAsync(toFetch)).reverse();

    results.forEach((result, index) => {
      if (result === undefined) {
        results[index] = fetchResult.pop();
      }
    });

    return results;
  }

  public setLeaf(index: bigint, leaf: LinkedLeaf) {
    this.writeCache[leaf.path.toString()] = { leaf: leaf, index: index };
    this.leafStore.setLeaf(index, leaf);
  }

  // This is just used in the mergeIntoParent
  public writeLeaves(leaves: { leaf: LinkedLeaf; index: bigint }[]) {
    leaves.forEach(({ leaf, index }) => {
      this.setLeaf(index, leaf);
    });
  }

  // This gets the leaves from the cache.
  // Only used in mergeIntoParent
  public getWrittenLeaves(): { leaf: LinkedLeaf; index: bigint }[] {
    return Object.values(this.writeCache);
  }

  // This resets the cache (not the in memory tree).
  public resetWrittenLeaves() {
    this.writeCache = {};
  }

  protected async preloadZeroNode() {
    if (this.leafStore.getLeaf(0n) === undefined) {
      await this.preloadKey(0n);
    }
  }

  private async preloadMaximumIndex() {
    // Preload maximumIndex before all others, to have a accurate index loaded already
    // before setting a ny other leaves
    if (this.leafStore.getMaximumIndex() === undefined) {
      this.leafStore.maximumIndex = await this.parent.getMaximumIndexAsync();
    }
  }

  // Takes a list of paths and for each key collects the relevant nodes from the
  // parent tree and sets the leaf and node in the cached tree (and in-memory tree).
  public async preloadKeyInternal(
    path: bigint
  ): Promise<{ requiredTreeIndizes: bigint[] }> {
    const leaf = (await this.getLeavesAsync([path]))[0];

    if (leaf !== undefined) {
      // Update case, this leaf is the only one we need
      this.leafStore.setLeaf(leaf.index, leaf.leaf);

      return { requiredTreeIndizes: [leaf.index] };
    } else {
      // Insert case, this leaf doesn't yet exist - we need to fetch the previous one

      // Calling getLeafLessOrEqual assures that it is actually the leaf we want
      // (i.e. pointing over our path)
      // TODO Rename getLeafLessOrEqual
      const previousLeaf =
        this.leafStore.getLeafLessOrEqual(path) ??
        (await this.parent.getLeafLessOrEqualAsync(path));

      if (previousLeaf === undefined) {
        // throw Error("Previous Leaf should never be empty");
        // This only happens when the store is empty, because in this case, the tree
        // initializes the 0-leaf, but this only happens after preloading.
        const [zeroLeaf] = await this.parent.getLeavesAsync([0n]);
        if (zeroLeaf !== undefined) {
          throw Error("Previous Leaf should never be empty");
        }
        return {
          requiredTreeIndizes: [],
        };
      }

      this.leafStore.setLeaf(previousLeaf.index, previousLeaf.leaf);

      const maximumIndex = this.leafStore.getMaximumIndex();

      if (maximumIndex === undefined) {
        throw Error("Maximum index should be defined in parent.");
      }

      return { requiredTreeIndizes: [previousLeaf.index, maximumIndex + 1n] };
    }
  }

  public async preloadKey(path: bigint) {
    const { requiredTreeIndizes } = await this.preloadKeyInternal(path);
    await this.treeCache.preloadKeys(requiredTreeIndizes);
  }

  public async preloadKeys(paths: bigint[]): Promise<void> {
    const results = await mapSequential(paths, (x) =>
      this.preloadKeyInternal(x)
    );
    const treeIndizes = results.flatMap(
      ({ requiredTreeIndizes }) => requiredTreeIndizes
    );
    await this.treeCache.preloadKeys(treeIndizes);
  }

  // This merges the cache into the parent tree and resets the cache, but not the
  //  in-memory merkle tree.
  public async mergeIntoParent(): Promise<void> {
    const leaves = this.getWrittenLeaves();
    // In case no state got set we can skip this step
    if (leaves.length === 0) {
      return;
    }

    await this.parent.openTransaction();

    this.parent.writeLeaves(Object.values(leaves));

    await this.parent.commit();

    await this.treeCache.mergeIntoParent();

    this.resetWrittenLeaves();
  }

  public getLeafLessOrEqual(path: bigint) {
    return this.leafStore.getLeafLessOrEqual(path);
  }

  public getMaximumIndex() {
    return this.leafStore.getMaximumIndex();
  }
}
