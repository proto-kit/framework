import { Field, Provable } from "o1js";

import {
  InMemoryLinkedLeafStore,
  InMemoryMerkleTreeStorage,
  LinkedMerkleTree,
  LinkedMerkleTreeCircuitOps,
  LinkedMerkleTreeWitness,
} from "../../src";

describe("LinkedMerkleTree - Circuit Ops", () => {
  function setupTree() {
    const leafStore = new InMemoryLinkedLeafStore();
    const store = new InMemoryMerkleTreeStorage();
    return new LinkedMerkleTree(store, leafStore);
  }

  let tree: LinkedMerkleTree;

  beforeEach(() => {
    tree = setupTree();
  });

  it("should correctly verify insert witness", () => {
    try {
      const root = tree.getRoot();
      const insertWitness = tree.setLeaf(5n, 1000n);

      const globalState = LinkedMerkleTreeCircuitOps.applyTreeWrite(
        root,
        insertWitness,
        {
          path: Field(5),
          from: Field(0),
          to: Field(1000),
        },
        0
      );

      expect(globalState.toString()).toStrictEqual(tree.getRoot().toString());
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  it("should correctly verify update witness", () => {
    try {
      tree.setLeaf(5n, 1000n);
      tree.setLeaf(10n, 1500n);

      const root = tree.getRoot();

      const updateWitness = tree.setLeaf(10n, 500n);

      const globalState = LinkedMerkleTreeCircuitOps.applyTreeWrite(
        root,
        updateWitness,
        {
          path: Field(10),
          from: Field(1500),
          to: Field(500),
        },
        0
      );

      expect(globalState.toString()).toStrictEqual(tree.getRoot().toString());
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  it("should not update root when only reading", () => {
    tree.setLeaf(5n, 1000n);
    tree.setLeaf(10n, 1500n);

    const root = tree.getRoot();

    const updateWitness = tree.getReadWitness(10n);

    const globalState = LinkedMerkleTreeCircuitOps.applyTreeWrite(
      root,
      LinkedMerkleTreeWitness.fromReadWitness(updateWitness),
      {
        path: Field(10),
        from: Field(1500),
        to: Field(1500),
      },
      0
    );

    expect(globalState.toString()).toStrictEqual(root.toString());
    expect(globalState.toString()).toStrictEqual(tree.getRoot().toString());
  });

  it("should noop when used with a dummy witness", () => {
    tree.setLeaf(5n, 1000n);
    tree.setLeaf(10n, 1500n);

    const root = tree.getRoot();

    const globalState = LinkedMerkleTreeCircuitOps.applyTreeWrite(
      root,
      LinkedMerkleTree.dummyWitness(),
      {
        path: Field(0),
        from: Field(0),
        to: Field(0),
      },
      0
    );

    expect(globalState.toString()).toStrictEqual(root.toString());
    expect(globalState.toString()).toStrictEqual(tree.getRoot().toString());
  });

  it("Circuit size", async () => {
    const root = tree.getRoot();

    const updateWitness = tree.setLeaf(10n, 500n);

    const cs = await Provable.constraintSystem(() => {
      const rootWitness = Provable.witness(Field, () => root);
      const updateWitnessWitness = Provable.witness(
        LinkedMerkleTreeWitness,
        () => updateWitness
      );
      const treeWrite = {
        path: Provable.witness(Field, () => 1),
        from: Provable.witness(Field, () => 1),
        to: Provable.witness(Field, () => 1),
      };

      LinkedMerkleTreeCircuitOps.applyTreeWrite(
        rootWitness,
        updateWitnessWitness,
        treeWrite,
        0
      );
    });

    console.log(cs.rows);

    expect(cs.rows).toBeLessThan(2500);
  });
});
