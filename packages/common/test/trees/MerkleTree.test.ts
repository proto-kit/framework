import { beforeEach } from "@jest/globals";
import { Field } from "o1js";

import {
  createMerkleTree,
  InMemoryMerkleTreeStorage,
  log,
  RollupMerkleTree,
  range,
} from "../../src";

describe("batch setLeaf", () => {
  function generateBatch(
    size: number,
    height: number,
    generator = () => Field.random().toBigInt()
  ) {
    const max = 2n ** BigInt(height - 1);
    return range(0, size).map(() => ({
      index: generator() % max,
      leaf: Field.random(),
    }));
  }

  function generateBatchAdjacent(size: number, height: number) {
    let start = 0n;
    return generateBatch(size, height, () => {
      start += 1n;
      return start - 1n;
    });
  }

  function captureTime<R>(f: () => R): [number, R] {
    const start = Date.now();
    const ret = f();
    return [Date.now() - start, ret];
  }
  const height = 10;
  const maxIndex = 2n ** BigInt(height - 1) - 1n;

  it.each([
    [
      { index: 1n, leaf: Field(5) },
      { index: maxIndex, leaf: Field(7) },
    ],
    [
      { index: maxIndex, leaf: Field(7) },
      { index: maxIndex - 1n, leaf: Field(7) },
      { index: 50n, leaf: Field(7) },
      { index: 1n, leaf: Field(5) },
    ],
    generateBatch(5, height),
    generateBatch(10, height),
    generateBatch(50, height),
    generateBatch(300, height),
  ])("correctness", (...writes) => {
    const Tree = createMerkleTree(height);
    const tree1 = new Tree(new InMemoryMerkleTreeStorage());
    const tree2 = new Tree(new InMemoryMerkleTreeStorage());

    writes.forEach(({ index, leaf }) => {
      tree1.setLeaf(index, leaf);
    });

    tree2.setLeaves(writes);

    expect(tree1.getRoot().toString()).toStrictEqual(
      tree2.getRoot().toString()
    );
  });

  it.each([
    // This tests the correct retrieval of previously-set siblings (vs. above
    // where always fetch zero-siblings)
    [[{ index: 1n, leaf: Field(5) }], [{ index: 4n, leaf: Field(1) }]],
    [[{ index: 4n, leaf: Field(5) }], [{ index: 1n, leaf: Field(1) }]],
  ])("correctness - batches", (...writes) => {
    expect.assertions(writes.length);

    const Tree = createMerkleTree(height);
    const tree1 = new Tree(new InMemoryMerkleTreeStorage());
    const tree2 = new Tree(new InMemoryMerkleTreeStorage());

    writes.forEach((writes2) => {
      writes2.forEach(({ index, leaf }) => {
        tree1.setLeaf(index, leaf);
      });

      tree2.setLeaves(writes2);

      expect(tree1.getRoot().toString()).toStrictEqual(
        tree2.getRoot().toString()
      );
    });
  });

  it.each([
    ["random", 10, generateBatch],
    ["random", 100, generateBatch],
    ["adjacent", 100, generateBatchAdjacent],
    ["adjacent", 10, generateBatchAdjacent],
  ])("test speedup: %s (%i leaves)", (label, batchSize, generateFunction) => {
    const tree1 = new RollupMerkleTree(new InMemoryMerkleTreeStorage());
    const tree2 = new RollupMerkleTree(new InMemoryMerkleTreeStorage());

    const batch = generateFunction(batchSize, RollupMerkleTree.HEIGHT);

    const slice = batch.slice();
    const [time1] = captureTime(() => tree1.setLeaves(slice));
    const [time2] = captureTime(() =>
      batch.forEach(({ index, leaf }) => tree2.setLeaf(index, leaf))
    );

    console.log(`Speedup for batch size ${batchSize}, mode ${label}`);
    console.log(time1);
    console.log(time2);

    expect(tree1.getRoot().toString()).toStrictEqual(
      tree2.getRoot().toString()
    );
  });
});

describe.each([4, 16, 256])("cachedMerkleTree - %s", (height) => {
  class MerkleTree extends createMerkleTree(height) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  class MerkleTreeWitness extends MerkleTree.WITNESS {}

  let store: InMemoryMerkleTreeStorage;
  let tree: MerkleTree;

  beforeEach(() => {
    log.setLevel("INFO");

    store = new InMemoryMerkleTreeStorage();
    tree = new MerkleTree(store);
  });

  it("should have the same root when empty", () => {
    expect.assertions(1);

    expect(tree.getRoot().toBigInt()).toStrictEqual(MerkleTree.EMPTY_ROOT);
  });

  it("should have a different root when not empty", () => {
    expect.assertions(1);

    tree.setLeaf(1n, Field(1));

    expect(tree.getRoot().toBigInt()).not.toStrictEqual(MerkleTree.EMPTY_ROOT);
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
