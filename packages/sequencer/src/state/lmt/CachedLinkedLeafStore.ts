import {
  InMemoryLinkedLeafStore,
  LinkedLeaf,
  mapSequential,
  LinkedLeafStore,
  assertDefined,
  StoredLeaf,
  filterNonUndefined,
} from "@proto-kit/common";
// eslint-disable-next-line import/no-extraneous-dependencies
import zip from "lodash/zip";
import groupBy from "lodash/groupBy";

import { AsyncLinkedLeafStore } from "../async/AsyncLinkedLeafStore";
import { CachedMerkleTreeStore } from "../merkle/CachedMerkleTreeStore";

export class CachedLinkedLeafStore implements LinkedLeafStore {
  private writeCache: {
    [key: string]: StoredLeaf;
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
    const results = Array<StoredLeaf | undefined>(paths.length).fill(undefined);

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
  public writeLeaves(leaves: StoredLeaf[]) {
    leaves.forEach(({ leaf, index }) => {
      this.setLeaf(index, leaf);
    });
  }

  // This gets the leaves from the cache.
  // Only used in mergeIntoParent
  public getWrittenLeaves(): StoredLeaf[] {
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

  async retrieveBatched<Input, Element>(
    inputs: Input[],
    cache: (input: Input) => Element | undefined,
    parent: (inputs: Input[]) => Promise<(Element | undefined)[]>
  ) {
    // The reason I built it using this weird closure-centric algorithm is that doing it
    // purely functional would require a lot more array operations than this
    const results: (Element | undefined)[] = Array.from({
      length: inputs.length,
    });

    const toFetchRemotely = inputs
      .map((input, i) => {
        const localResult = cache(input);
        if (localResult !== undefined) {
          results[i] = localResult;
          return undefined;
        } else {
          return { path: input, index: i };
        }
      })
      .filter(filterNonUndefined);

    let remoteResults: (Element | undefined)[] = [];
    if (toFetchRemotely.length > 0) {
      remoteResults = await parent(toFetchRemotely.map((value) => value.path));
    }

    zip(toFetchRemotely, remoteResults).forEach(([query, result]) => {
      assertDefined(query);

      results[query.index] = result;
    });

    return results;
  }

  // Takes a list of paths and for each key collects the relevant nodes from the
  // parent tree and sets the leaf and node in the cached tree (and in-memory tree).
  public async preloadKeysInternal(paths: bigint[]): Promise<void> {
    const leaves = await this.getLeavesAsync(paths);

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const zipped = zip(paths, leaves) as [bigint, StoredLeaf | undefined][];
    const groupedOps = groupBy(zipped, ([, leaf]) =>
      leaf !== undefined ? "update" : "insert"
    );

    let treeIndizesToFetch: bigint[] = [];

    if (groupedOps.update !== undefined) {
      // Preload updates
      const treeUpdates = groupedOps.update.map(([path, leaf]) => {
        assertDefined(leaf);

        // Update case, this leaf is the only one we need
        this.leafStore.setLeaf(leaf.index, leaf.leaf);

        return leaf.index;
      });
      treeIndizesToFetch.push(...treeUpdates);
    }

    if (groupedOps.insert !== undefined) {
      // Insert case, this leaf doesn't yet exist - we need to fetch the previous one
      // Calling getLeafLessOrEqual assures that it is actually the leaf we want
      // (i.e. pointing over our path)
      const previousLeaves = await this.retrieveBatched(
        groupedOps.insert.map(([path]) => path),
        this.leafStore.getLeafLessOrEqual.bind(this.leafStore),
        this.parent.getLeavesLessOrEqualAsync.bind(this.parent)
      );

      // This is a check that all previous leaves have been found, with the
      // one exception being when the tree is empty (see below)
      const anyUndefined =
        previousLeaves.findIndex((x) => x === undefined) > -1;
      if (anyUndefined) {
        // This only happens when the store is empty, because in this case, the tree
        // initializes the 0-leaf, but this only happens after preloading.
        const [zeroLeaf] = await this.parent.getLeavesAsync([0n]);
        if (zeroLeaf !== undefined) {
          throw Error("Previous Leaf should never be empty");
        }
      }

      const definedPreviousLeaves = previousLeaves.filter(filterNonUndefined);

      definedPreviousLeaves.forEach(({ index, leaf }) =>
        this.leafStore.setLeaf(index, leaf)
      );
      treeIndizesToFetch.push(
        ...definedPreviousLeaves.map(({ index }) => index)
      );

      // Additionally preload the next empty tree index.
      // This is enough, because we know that all subsequent empty tree indizes
      // (in case there are multiple inserts) will be bigger than that index.
      // In that case, everything will be either contained in the siblings of this index
      // or be zero. So in either case, we don't have to preload more than we do here.
      const maximumIndex = this.leafStore.getMaximumIndex() ?? -1n;
      // if (maximumIndex === undefined) {
      //   throw Error("Maximum index should be defined in parent.");
      // }
      treeIndizesToFetch.push(maximumIndex + 1n);
    }

    await this.treeCache.preloadKeys(treeIndizesToFetch);
  }

  public async preloadKey(path: bigint) {
    await this.preloadKeysInternal([path]);
  }

  public async preloadKeys(paths: bigint[]): Promise<void> {
    await this.preloadKeysInternal(paths);
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
