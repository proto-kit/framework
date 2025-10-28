import { beforeEach } from "@jest/globals";
import { Field, Poseidon } from "o1js";

import {
  createLinkedMerkleTree,
  InMemoryLinkedLeafStore,
  InMemoryMerkleTreeStorage,
  log,
} from "../../src";
import { expectDefined } from "../../dist/utils";

describe.each([4, 16, 254])("cachedMerkleTree - %s", (height) => {
  class LinkedMerkleTree extends createLinkedMerkleTree(height) {}

  let leafStore: InMemoryLinkedLeafStore;
  let merkleStore: InMemoryMerkleTreeStorage;
  let tree: LinkedMerkleTree;

  beforeEach(() => {
    log.setLevel("INFO");

    leafStore = new InMemoryLinkedLeafStore();
    merkleStore = new InMemoryMerkleTreeStorage();
    tree = new LinkedMerkleTree(merkleStore, leafStore);
  });

  it("should have the same root when empty", () => {
    expect.assertions(2);

    expect(tree.getRoot().toString()).toStrictEqual(
      LinkedMerkleTree.EMPTY_ROOT.toString()
    );
    expectDefined(tree.getLeaf(0n));
  });

  it("should have a different root when not empty", () => {
    expect.assertions(1);

    tree.setLeaf(1n, 1n);

    expect(tree.getRoot().toString()).not.toStrictEqual(
      LinkedMerkleTree.EMPTY_ROOT.toString()
    );
  });

  it("should provide correct witnesses", () => {
    expect.assertions(2);

    tree.setLeaf(1n, 1n);
    tree.setLeaf(5n, 5n);

    const witness = tree.getReadWitness(5n);

    expect(witness.leaf.value.toString()).toStrictEqual("5");
    expect(
      witness.merkleWitness.calculateRoot(witness.leaf.hash()).toString()
    ).toStrictEqual(tree.getRoot().toString());
  });

  it("should have invalid witnesses with wrong values", () => {
    expect.assertions(1);

    tree.setLeaf(1n, 1n);
    tree.setLeaf(5n, 5n);

    const witness = tree.getReadWitness(5n);

    expect(
      witness.merkleWitness.calculateRoot(Field(6)).toString()
    ).not.toStrictEqual(tree.getRoot().toString());
  });

  it("should have valid witnesses with changed value on the same leafs", () => {
    expect.assertions(1);

    tree.setLeaf(1n, 1n);
    tree.setLeaf(5n, 5n);

    const witness = tree.getReadWitness(5n);

    tree.setLeaf(5n, 10n);

    expect(
      witness.merkleWitness
        .calculateRoot(
          Poseidon.hash([Field(10), witness.leaf.path, witness.leaf.nextPath])
        )
        .toString()
    ).toStrictEqual(tree.getRoot().toString());
  });

  it("should return zeroNode", () => {
    expect.assertions(4);
    const MAX_FIELD_VALUE: bigint = Field.ORDER - 1n;
    const zeroLeaf = tree.getLeaf(0n);
    expectDefined(zeroLeaf);
    expect(zeroLeaf.value.toString()).toStrictEqual("0");
    expect(zeroLeaf.path.toString()).toStrictEqual("0");
    expect(zeroLeaf.nextPath.toString()).toStrictEqual(
      MAX_FIELD_VALUE.toString()
    );
  });
});

// Separate describe here since we only want small trees for this test.
describe("Error check", () => {
  class LinkedMerkleTree extends createLinkedMerkleTree(4) {}
  let leafStore: InMemoryLinkedLeafStore;
  let merkleStore: InMemoryMerkleTreeStorage;
  let tree: LinkedMerkleTree;

  it("throw for invalid index", () => {
    log.setLevel("INFO");

    leafStore = new InMemoryLinkedLeafStore();
    merkleStore = new InMemoryMerkleTreeStorage();
    tree = new LinkedMerkleTree(merkleStore, leafStore);
    expect(() => {
      for (let i = 0; i < 2n ** BigInt(4) + 1n; i++) {
        tree.setLeaf(BigInt(i), 2n);
      }
    }).toThrow("Index greater than maximum leaf number");
  });
});
