/* eslint-disable @typescript-eslint/no-magic-numbers */
import { RollupMerkleTree } from "./RollupMerkleTree.js";
import { AsyncMerkleTreeStore, MerkleTreeStore } from "./MerkleTreeStore";

export class InMemoryMerkleTreeStorage implements MerkleTreeStore {
  protected readonly nodes: {
    [key: number]: {
      [key: string]: bigint;
    };
  } = {};

  public getNode(key: bigint, level: number): bigint | undefined {
    return this.nodes[level]?.[key.toString()];
  }

  public setNode(key: bigint, level: number, value: bigint): void {
    (this.nodes[level] ??= {})[key.toString()] = value;
  }
}

export class CachedMerkleTreeStore extends InMemoryMerkleTreeStorage {
  private writeCache: {
    [key: number]: {
      [key: string]: bigint;
    };
  } = {};

  public constructor(private readonly parent: AsyncMerkleTreeStore) {
    super();
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

  public async preloadKey(index: bigint): Promise<void> {
    // Algo from RollupMerkleTree.getWitness()
    const { leafCount, height } = RollupMerkleTree;

    if (index >= leafCount) {
      index %= leafCount;
    }

    // TODO Not practical at the moment. Improve pattern when implementing DB storage
    for (let level = 0; level < height - 1; level++) {
      const isLeft = index % 2n === 0n;

      const key = isLeft ? index + 1n : index - 1n;
      // eslint-disable-next-line no-await-in-loop
      const value = await this.parent.getNode(key, level);
      if (value !== undefined) {
        (this.nodes[level] ??= {})[key.toString()] = value;
      }
      index /= 2n;
    }
  }

  public async mergeIntoParent(): Promise<void> {
    this.parent.openTransaction();
    const { height } = RollupMerkleTree;
    const nodes = this.getWrittenNodes();

    const promises = Array.from({ length: height }).flatMap((_, level) => {
      return Object.entries(nodes[level]).map(async (entry) => {
        await this.parent.setNode(BigInt(entry[0]), level, entry[1]);
      });
    });

    await Promise.all(promises);

    this.parent.commit();
    this.writeCache = {};
  }
}
