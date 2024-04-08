import minBy from "lodash/minBy";
import { InMemoryMerkleTreeStorage } from "../trees/InMemoryMerkleTreeStorage";
import { MerkleTreeStore } from "../trees/MerkleTreeStore";
import {
  LinkedMerkleTreeLeaf,
} from "./LinkedMerkleTree";

type FoundLeaf = {
  leaf: LinkedMerkleTreeLeaf;
  leafIndex: bigint;
};

export interface LinkedMerkleTreeStore extends MerkleTreeStore {
  setLeaf(index: bigint, leaf: LinkedMerkleTreeLeaf): void;
  getLeaf(index: bigint): LinkedMerkleTreeLeaf | undefined;

  findLeafByPath(path: bigint): FoundLeaf | undefined;
  findPreviousByPath(path: bigint): FoundLeaf | undefined;

  getNextUsableIndex(): bigint;
  setNextUsableIndex(index: bigint): void;
}

/**
 * Do we want to store using leafIndex but then only query based on path?
 */
export class InMemoryLinkedMerkleTreeStore
  extends InMemoryMerkleTreeStorage
  implements LinkedMerkleTreeStore
{
  private leafs: Record<string, FoundLeaf | undefined> = {};
  private leafsByPath: Record<string, FoundLeaf | undefined> = {};

  private nextUsableIndex = 1n;

  public constructor() {
    super();
  }

  public setLeaf(index: bigint, leaf: LinkedMerkleTreeLeaf) {
    const foundLeaf = {
      leaf,
      leafIndex: index,
    };
    this.leafs[index.toString()] = foundLeaf;
    this.leafsByPath[leaf.path.toString()] = foundLeaf;
  }

  public getLeaf(index: bigint): LinkedMerkleTreeLeaf | undefined {
    return this.leafs[index.toString()]?.leaf;
  }

  public findLeafByPath(path: bigint): FoundLeaf | undefined {
    return this.leafsByPath[path.toString()];
  }

  public findPreviousByPath(path: bigint): FoundLeaf | undefined {
    const minEntry = minBy(Object.entries(this.leafsByPath), ([key, leaf]) => {
      if (leaf === undefined || leaf.leaf.path.toBigInt() >= path) {
        return 2n ** 256n - 1n;
      }
      return path - leaf.leaf.path.toBigInt();
    });
    return minEntry?.[1];
  }

  public getNextUsableIndex(): bigint {
    return this.nextUsableIndex;
  }

  public setNextUsableIndex(index: bigint): void {
    this.nextUsableIndex = index;
  }
}
