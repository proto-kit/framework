import {
  log,
  noop,
  InMemoryMerkleTreeStorage,
  RollupMerkleTree,
} from "@proto-kit/common";

import { AsyncMerkleTreeStore } from "../async/AsyncMerkleTreeStore";

export class CachedMerkleTreeStore
  extends InMemoryMerkleTreeStorage
  implements AsyncMerkleTreeStore
{
  private writeCache: {
    [key: number]: {
      [key: string]: bigint;
    };
  } = {};

  public openTransaction = noop;

  public commit = noop;

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

  // eslint-disable-next-line sonarjs/cognitive-complexity
  public async preloadKey(index: bigint): Promise<void> {
    // Algo from RollupMerkleTree.getWitness()
    const { leafCount, HEIGHT } = RollupMerkleTree;

    if (index >= leafCount) {
      index %= leafCount;
    }

    // eslint-disable-next-line no-warning-comments,max-len
    // TODO Not practical at the moment. Improve pattern when implementing DB storage
    for (let level = 0; level < HEIGHT; level++) {
      const key = index;

      const isLeft = index % 2n === 0n;
      const siblingKey = isLeft ? index + 1n : index - 1n;

      // Only preload node if it is not already preloaded.
      // We also don't want to overwrite because changes will get lost (tracing)
      if (this.getNode(key, level) === undefined) {
        // eslint-disable-next-line no-await-in-loop
        const value = await this.parent.getNodeAsync(key, level);
        if (level === 0) {
          log.trace(`Preloaded ${key} @ ${level} -> ${value ?? "-"}`);
        }
        if (value !== undefined) {
          this.setNode(key, level, value);
        }
      }

      if (this.getNode(siblingKey, level) === undefined) {
        // eslint-disable-next-line no-await-in-loop
        const sibling = await this.parent.getNodeAsync(siblingKey, level);
        if (sibling !== undefined) {
          this.setNode(siblingKey, level, sibling);
        }
      }
      index /= 2n;
    }
  }

  public async mergeIntoParent(): Promise<void> {
    // In case no state got set we can skip this step
    if (Object.keys(this.writeCache).length === 0) {
      return;
    }

    this.parent.openTransaction();
    const nodes = this.getWrittenNodes();

    const promises = Object.keys(nodes).flatMap((levelString) => {
      const level = Number(levelString);
      return Object.entries(nodes[level]).map(async (entry) => {
        await this.parent.setNodeAsync(BigInt(entry[0]), level, entry[1]);
      });
    });

    await Promise.all(promises);

    this.parent.commit();
    this.resetWrittenNodes();
  }

  public async setNodeAsync(
    key: bigint,
    level: number,
    value: bigint
  ): Promise<void> {
    this.setNode(key, level, value);
  }

  public async getNodeAsync(
    key: bigint,
    level: number
  ): Promise<bigint | undefined> {
    return (
      this.getNode(key, level) ?? (await this.parent.getNodeAsync(key, level))
    );
  }
}
