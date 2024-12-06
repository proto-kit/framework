import {
  log,
  InMemoryLinkedLeafStore,
  LinkedLeaf,
  InMemoryMerkleTreeStorage,
  PreloadingLinkedMerkleTreeStore,
  mapSequential,
} from "@proto-kit/common";

import {
  MerkleTreeNode,
  MerkleTreeNodeQuery,
} from "../async/AsyncMerkleTreeStore";
import { AsyncLinkedMerkleTreeStore } from "../async/AsyncLinkedMerkleTreeStore";

export class CachedLinkedMerkleTreeStore
  implements PreloadingLinkedMerkleTreeStore
{
  private writeCache: {
    nodes: {
      [key: number]: {
        [key: string]: bigint;
      };
    };
    leaves: {
      [key: string]: { leaf: LinkedLeaf; index: bigint };
    };
  } = { nodes: {}, leaves: {} };

  private readonly leafStore = new InMemoryLinkedLeafStore();

  private readonly nodeStore = new InMemoryMerkleTreeStorage();

  private constructor(private readonly parent: AsyncLinkedMerkleTreeStore) {}

  public static async new(
    parent: AsyncLinkedMerkleTreeStore
  ): Promise<CachedLinkedMerkleTreeStore> {
    const cachedInstance = new CachedLinkedMerkleTreeStore(parent);
    await cachedInstance.preloadMaximumIndex();
    return cachedInstance;
  }

  // This gets the nodes from the in memory store (which looks also to be the cache).
  public getNode(key: bigint, level: number): bigint | undefined {
    return this.nodeStore.getNode(key, level);
  }

  // This gets the nodes from the in memory store.
  // If the node is not in the in-memory store it goes to the parent (i.e.
  // what's put in the constructor).
  public async getNodesAsync(
    nodes: MerkleTreeNodeQuery[]
  ): Promise<(bigint | undefined)[]> {
    const results = Array<bigint | undefined>(nodes.length).fill(undefined);

    const toFetch: MerkleTreeNodeQuery[] = [];

    nodes.forEach((node, index) => {
      const localResult = this.getNode(node.key, node.level);
      if (localResult !== undefined) {
        results[index] = localResult;
      } else {
        toFetch.push(node);
      }
    });

    // Reverse here, so that we can use pop() later
    const fetchResult = (await this.parent.getNodesAsync(toFetch)).reverse();

    results.forEach((result, index) => {
      if (result === undefined) {
        results[index] = fetchResult.pop();
      }
    });

    return results;
  }

  // This sets the nodes in the cache and in the in-memory tree.
  public setNode(key: bigint, level: number, value: bigint) {
    this.nodeStore.setNode(key, level, value);
    (this.writeCache.nodes[level] ??= {})[key.toString()] = value;
  }

  // This is basically setNode (cache and in-memory) for a list of nodes.
  // Looks only to be used in the mergeIntoParent
  public writeNodes(nodes: MerkleTreeNode[]) {
    nodes.forEach(({ key, level, value }) => {
      this.setNode(key, level, value);
    });
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

  // This is just used in the mergeIntoParent.
  // It doesn't need any fancy logic and just updates the leaves.
  // I don't think we need to coordinate this with the nodes
  // or do any calculations. Just a straight copy and paste.
  public writeLeaves(leaves: { leaf: LinkedLeaf; index: bigint }[]) {
    leaves.forEach(({ leaf, index }) => {
      this.setLeaf(index, leaf);
    });
  }

  public setLeaf(index: bigint, leaf: LinkedLeaf) {
    this.writeCache.leaves[leaf.path.toString()] = { leaf: leaf, index: index };
    this.leafStore.setLeaf(index, leaf);
  }

  // This gets the nodes from the cache.
  // Only used in mergeIntoParent
  public getWrittenNodes(): {
    [key: number]: {
      [key: string]: bigint;
    };
  } {
    return this.writeCache.nodes;
  }

  // This gets the leaves from the cache.
  // Only used in mergeIntoParent
  public getWrittenLeaves(): { leaf: LinkedLeaf; index: bigint }[] {
    return Object.values(this.writeCache.leaves);
  }

  // This resets the cache (not the in memory tree).
  public resetWrittenTree() {
    this.writeCache = { nodes: {}, leaves: {} };
  }

  // Used only in the preloadKeys
  // Basically, gets all of the relevant nodes (and siblings) in the Merkle tree
  // at the various levels required to produce a witness for the given index (at level 0).
  // But only gets those that aren't already in the cache.
  private collectNodesToFetch(index: bigint) {
    // This is hardcoded, but should be changed.
    const HEIGHT = 40n;
    const leafCount = 2n ** (HEIGHT - 1n);

    let currentIndex = index >= leafCount ? index % leafCount : index;

    const nodesToRetrieve: MerkleTreeNodeQuery[] = [];

    for (let level = 0; level < HEIGHT; level++) {
      const key = currentIndex;

      const isLeft = key % 2n === 0n;
      const siblingKey = isLeft ? key + 1n : key - 1n;

      // Only preload node if it is not already preloaded.
      // We also don't want to overwrite because changes will get lost (tracing)
      if (this.getNode(key, level) === undefined) {
        nodesToRetrieve.push({
          key,
          level,
        });
        if (level === 0) {
          log.trace(`Queued preloading of ${key} @ ${level}`);
        }
      }

      if (this.getNode(siblingKey, level) === undefined) {
        nodesToRetrieve.push({
          key: siblingKey,
          level,
        });
      }
      currentIndex /= 2n;
    }
    return nodesToRetrieve;
  }

  protected async preloadMaximumIndex() {
    if (this.leafStore.getMaximumIndex() === undefined) {
      this.leafStore.maximumIndex = await this.parent.getMaximumIndexAsync();
    }
  }

  public async preloadNodes(indexes: bigint[]) {
    const nodesToRetrieve = indexes.flatMap((key) =>
      this.collectNodesToFetch(key)
    );

    const results = await this.parent.getNodesAsync(nodesToRetrieve);
    nodesToRetrieve.forEach(({ key, level }, index) => {
      const value = results[index];
      if (value !== undefined) {
        this.setNode(key, level, value);
      }
    });
  }

  public getLeaf(path: bigint) {
    return this.leafStore.getLeaf(path);
  }

  // Takes a list of paths and for each key collects the relevant nodes from the
  // parent tree and sets the leaf and node in the cached tree (and in-memory tree).
  public async preloadKey(path: bigint) {
    const leaf =
      this.leafStore.getLeaf(path) ??
      (await this.parent.getLeavesAsync([path]))[0];
    if (leaf !== undefined) {
      this.leafStore.setLeaf(leaf.index, leaf.leaf);
      // Update
      await this.preloadNodes([leaf.index]);
    } else {
      // Insert
      const previousLeaf =
        this.leafStore.getLeafLessOrEqual(path) ??
        (await this.parent.getLeafLessOrEqualAsync(path));
      if (previousLeaf === undefined) {
        throw Error("Previous Leaf should never be empty");
      }
      this.leafStore.setLeaf(previousLeaf.index, previousLeaf.leaf);
      await this.preloadNodes([previousLeaf.index]);
      const maximumIndex =
        this.leafStore.getMaximumIndex() ??
        (await this.parent.getMaximumIndexAsync());
      if (maximumIndex === undefined) {
        throw Error("Maximum index should be defined in parent.");
      }
      await this.preloadNodes([maximumIndex + 1n]);
    }
  }

  public async preloadKeys(paths: bigint[]): Promise<void> {
    await mapSequential(paths, (x) => this.preloadKey(x));
  }

  // This merges the cache into the parent tree and resets the cache, but not the
  //  in-memory merkle tree.
  public async mergeIntoParent(): Promise<void> {
    // In case no state got set we can skip this step
    if (Object.keys(this.writeCache.leaves).length === 0) {
      return;
    }

    await this.parent.openTransaction();
    const nodes = this.getWrittenNodes();
    const leaves = this.getWrittenLeaves();

    this.parent.writeLeaves(Object.values(leaves));
    const writes = Object.keys(nodes).flatMap((levelString) => {
      const level = Number(levelString);
      return Object.entries(nodes[level]).map<MerkleTreeNode>(
        ([key, value]) => {
          return {
            key: BigInt(key),
            level,
            value,
          };
        }
      );
    });

    this.parent.writeNodes(writes);

    await this.parent.commit();
    this.resetWrittenTree();
  }

  public getLeafLessOrEqual(path: bigint) {
    return this.leafStore.getLeafLessOrEqual(path);
  }

  public getMaximumIndex() {
    return this.leafStore.getMaximumIndex();
  }
}
