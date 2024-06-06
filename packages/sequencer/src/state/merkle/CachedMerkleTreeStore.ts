import {
  log,
  noop,
  InMemoryMerkleTreeStorage,
  RollupMerkleTree,
} from "@proto-kit/common";

import {
  AsyncMerkleTreeStore,
  MerkleTreeNode,
  MerkleTreeNodeQuery,
} from "../async/AsyncMerkleTreeStore";

export class CachedMerkleTreeStore
  extends InMemoryMerkleTreeStorage
  implements AsyncMerkleTreeStore
{
  private writeCache: {
    [key: number]: {
      [key: string]: bigint;
    };
  } = {};

  public async openTransaction(): Promise<void> {
    noop();
  }

  public async commit(): Promise<void> {
    noop();
  }

  public constructor(private readonly parent: AsyncMerkleTreeStore) {
    super();
  }

  public getNode(key: bigint, level: number): bigint | undefined {
    return super.getNode(key, level);
  }

  public setNode(key: bigint, level: number, value: bigint) {
    super.setNode(key, level, value);
    (this.writeCache[level] ??= {})[key.toString()] = value;
  }

  public getWrittenNodes(): {
    [key: number]: {
      [key: string]: bigint;
    };
  } {
    return this.writeCache;
  }

  public resetWrittenNodes() {
    this.writeCache = {};
  }

  private collectNodesToFetch(index: bigint) {
    // Algo from RollupMerkleTree.getWitness()
    const { leafCount, HEIGHT } = RollupMerkleTree;

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

  public async preloadKeys(keys: bigint[]) {
    const nodesToRetrieve = keys.flatMap((key) =>
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

  public async preloadKey(index: bigint): Promise<void> {
    await this.preloadKeys([index]);
  }

  public async mergeIntoParent(): Promise<void> {
    // In case no state got set we can skip this step
    if (Object.keys(this.writeCache).length === 0) {
      return;
    }

    await this.parent.openTransaction();
    const nodes = this.getWrittenNodes();

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
    this.resetWrittenNodes();
  }

  public async setNodeAsync(
    key: bigint,
    level: number,
    value: bigint
  ): Promise<void> {
    this.setNode(key, level, value);
  }

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

  public writeNodes(nodes: MerkleTreeNode[]): void {
    nodes.forEach(({ key, level, value }) => {
      this.setNode(key, level, value);
    });
  }
}
