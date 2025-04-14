import { InMemoryLinkedLeafStore, LinkedLeaf, noop } from "@proto-kit/common";

import { AsyncLinkedLeafStore } from "../../state/async/AsyncLinkedLeafStore";

import { InMemoryAsyncMerkleTreeStore } from "./InMemoryAsyncMerkleTreeStore";

export class InMemoryAsyncLinkedLeafStore implements AsyncLinkedLeafStore {
  private readonly leafStore = new InMemoryLinkedLeafStore();

  private readonly nodeStore = new InMemoryAsyncMerkleTreeStore();

  // public constructor() {
  //   const initialLeaf = initialLinkedLeaf();
  //   this.leafStore.setLeaf(0n, initialLeaf);
  //   this.nodeStore.writeNodes([{  }]);
  // }

  public get treeStore() {
    return this.nodeStore;
  }

  public async openTransaction(): Promise<void> {
    noop();
  }

  public async commit(): Promise<void> {
    noop();
  }

  // This is using the index/key
  public writeLeaves(leaves: { leaf: LinkedLeaf; index: bigint }[]) {
    leaves.forEach(({ leaf, index }) => {
      this.leafStore.setLeaf(index, leaf);
    });
  }

  public async getLeavesAsync(paths: bigint[]) {
    return paths.map((path) => {
      const leaf = this.leafStore.getLeaf(path);
      if (leaf !== undefined) {
        return leaf;
      }
      return undefined;
    });
  }

  public async getMaximumIndexAsync() {
    return this.leafStore.getMaximumIndex();
  }

  public async getPreviousLeavesAsync(paths: bigint[]) {
    return paths.map((path) => this.leafStore.getPreviousLeaf(path));
  }

  public setLeaf(index: bigint, value: LinkedLeaf) {
    this.leafStore.setLeaf(index, value);
  }

  public getLeaf(path: bigint) {
    return this.leafStore.getLeaf(path);
  }

  public getPreviousLeaf(path: bigint) {
    return this.leafStore.getPreviousLeaf(path);
  }

  public getMaximumIndex() {
    return this.leafStore.getMaximumIndex();
  }
}
