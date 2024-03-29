import { InMemoryMerkleTreeStorage, RollupMerkleTree } from "@proto-kit/common";
import { beforeEach, expect } from "@jest/globals";
import { Field } from "o1js";

import {
  CachedMerkleTreeStore,
  InMemoryAsyncMerkleTreeStore,
  SyncCachedMerkleTreeStore,
} from "../../src";

describe("cached merkle store", () => {
  const mainStore = new InMemoryAsyncMerkleTreeStore();

  beforeEach(async () => {
    const cachedStore = new CachedMerkleTreeStore(mainStore);

    const tree1 = new RollupMerkleTree(cachedStore);
    tree1.setLeaf(5n, Field("10"));
    await cachedStore.mergeIntoParent();
  });

  it("should cache multiple keys corretly", async () => {
    expect.assertions(3);

    const cache1 = new CachedMerkleTreeStore(mainStore);
    const tree1 = new RollupMerkleTree(cache1);

    const cache2 = new CachedMerkleTreeStore(cache1);
    const tree2 = new RollupMerkleTree(cache2);

    tree1.setLeaf(16n, Field(16));
    tree1.setLeaf(46n, Field(46));

    await cache2.preloadKeys([16n, 46n]);

    expect(tree2.getNode(0, 16n).toBigInt()).toBe(16n);
    expect(tree2.getNode(0, 46n).toBigInt()).toBe(46n);
    expect(tree2.getRoot().toString()).toStrictEqual(tree1.getRoot().toString())
  });

  it("should cache correctly", async () => {
    expect.assertions(9);

    await expect(
      mainStore.getNodesAsync([{ key: 5n, level: 0 }])
    ).resolves.toStrictEqual([10n]);

    const cache1 = new CachedMerkleTreeStore(mainStore);
    const tree1 = new RollupMerkleTree(cache1);

    const cache2 = new SyncCachedMerkleTreeStore(cache1);
    const tree2 = new RollupMerkleTree(cache2);

    await cache1.preloadKey(5n);

    tree1.setLeaf(10n, Field("20"));

    expect(tree2.getNode(0, 10n).toBigInt()).toBe(20n);

    const witness = tree2.getWitness(5n);

    expect(witness.calculateRoot(Field(10)).toString()).toBe(
      tree1.getRoot().toString()
    );
    expect(witness.calculateRoot(Field(11)).toString()).not.toBe(
      tree1.getRoot().toString()
    );

    const witness2 = tree1.getWitness(10n);

    expect(witness2.calculateRoot(Field(20)).toString()).toBe(
      tree2.getRoot().toString()
    );

    tree2.setLeaf(15n, Field(30));

    expect(tree1.getRoot().toString()).not.toBe(tree2.getRoot().toString());

    cache2.mergeIntoParent();

    expect(tree1.getRoot().toString()).toBe(tree2.getRoot().toString());
    expect(tree1.getNode(0, 15n).toString()).toBe("30");

    await cache1.mergeIntoParent();

    const cachedStore = new CachedMerkleTreeStore(mainStore);
    await cachedStore.preloadKey(15n);

    expect(new RollupMerkleTree(cachedStore).getRoot().toString()).toBe(
      tree2.getRoot().toString()
    );
  });
});
