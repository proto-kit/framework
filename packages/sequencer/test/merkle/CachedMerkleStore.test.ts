import { RollupMerkleTree } from "@proto-kit/protocol";
import { beforeEach, expect } from "@jest/globals";
import { Field } from "o1js";

import { MockAsyncMerkleTreeStore } from "../../src/storage/MockStorageDependencyFactory";
import {
  CachedMerkleTreeStore,
  SyncCachedMerkleTreeStore,
} from "../../src/protocol/production/execution/CachedMerkleTreeStore";

describe("cached merkle store", () => {
  const mainStore = new MockAsyncMerkleTreeStore();

  beforeEach(async () => {
    const cachedStore = new CachedMerkleTreeStore(mainStore);

    const tree1 = new RollupMerkleTree(cachedStore);
    tree1.setLeaf(5n, Field("10"));
    await cachedStore.mergeIntoParent();
  });

  it("should cache correctly", async () => {
    expect.assertions(9);

    await expect(mainStore.getNodeAsync(5n, 0)).resolves.toBe(10n);

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
