import { beforeEach } from "@jest/globals";
import { Field } from "o1js";

import { createMerkleTree, InMemoryMerkleTreeStorage, log } from "../../src";

describe.each([4, 16, 256])("cachedMerkleTree - %s", (height) => {
  class RollupMerkleTree extends createMerkleTree(height) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  class RollupMerkleTreeWitness extends RollupMerkleTree.WITNESS {}

  let store: InMemoryMerkleTreeStorage;
  let tree: RollupMerkleTree;

  beforeEach(() => {
    log.setLevel("INFO");

    store = new InMemoryMerkleTreeStorage();
    tree = new RollupMerkleTree(store);
  });

  it("should have the same root when empty", () => {
    expect.assertions(1);

    expect(tree.getRoot().toBigInt()).toStrictEqual(
      RollupMerkleTree.EMPTY_ROOT
    );
  });

  it("should have a different root when not empty", () => {
    expect.assertions(1);

    tree.setLeaf(1n, Field(1));

    expect(tree.getRoot().toBigInt()).not.toStrictEqual(
      RollupMerkleTree.EMPTY_ROOT
    );
  });

  it("should have the same root after adding and removing item", () => {
    expect.assertions(1);

    tree.setLeaf(1n, Field(1));

    const root = tree.getRoot();

    tree.setLeaf(5n, Field(5));
    tree.setLeaf(5n, Field(0));

    expect(tree.getRoot().toBigInt()).toStrictEqual(root.toBigInt());
  });

  it("should provide correct witnesses", () => {
    expect.assertions(1);

    tree.setLeaf(1n, Field(1));
    tree.setLeaf(5n, Field(5));

    const witness = tree.getWitness(5n);

    expect(witness.calculateRoot(Field(5)).toBigInt()).toStrictEqual(
      tree.getRoot().toBigInt()
    );
  });

  it("should have invalid witnesses with wrong values", () => {
    expect.assertions(1);

    tree.setLeaf(1n, Field(1));
    tree.setLeaf(5n, Field(5));

    const witness = tree.getWitness(5n);

    expect(witness.calculateRoot(Field(6)).toBigInt()).not.toStrictEqual(
      tree.getRoot().toBigInt()
    );
  });

  it("should have valid witnesses with changed value on the same leafs", () => {
    expect.assertions(1);

    tree.setLeaf(1n, Field(1));
    tree.setLeaf(5n, Field(5));

    const witness = tree.getWitness(5n);

    tree.setLeaf(5n, Field(10));

    expect(witness.calculateRoot(Field(10)).toBigInt()).toStrictEqual(
      tree.getRoot().toBigInt()
    );
  });

  it("should throw for invalid index", () => {
    expect.assertions(2);

    const index = 2n ** BigInt(height) + 1n;

    expect(() => {
      tree.setLeaf(index, Field(1));
    }).toThrow("Index greater than maximum leaf number");

    expect(() => {
      tree.getNode(0, index);
    }).toThrow("Index greater than maximum leaf number");
  });
});
