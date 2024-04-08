import { Field } from "o1js";
import { expectDefined } from "../../src";
import {
  LinkedMerkleTree,
  ProvableLinkedMerkleTreeLeaf
} from "../../src/lmt/LinkedMerkleTree";
import { InMemoryLinkedMerkleTreeStore } from "../../src/lmt/LinkedMerkleTreeStore";

describe("lmt", () => {
  let tree: LinkedMerkleTree;
  let store: InMemoryLinkedMerkleTreeStore;

  beforeEach(() => {
    store = new InMemoryLinkedMerkleTreeStore();
    tree = new LinkedMerkleTree(store);
  });

  it("should intialize correctly", () => {
    const valueBefore0 = tree.getNode(0, 0n);
    const valueBefore1 = tree.getNode(0, 1n);

    // Check that index 0 has the empty default leaf and index 1 is empty
    expect(valueBefore0.toBigInt()).toBe(ProvableLinkedMerkleTreeLeaf.zero().treeValue().toBigInt());
    expect(valueBefore1.toBigInt()).toBe(0n);
  })

  describe("mutation tests", () => {
    beforeEach(() => {
      tree.writeValueToPath(5n, Field(100));
    })

    it("should insert new leaf into leafstore", () => {
      const leaf = tree.linkedStore.getLeaf(1n);

      expectDefined(leaf);
      expect(leaf.path.toBigInt()).toBe(5n);
      expect(leaf.next.toBigInt()).toBe(Field.ORDER - 1n);
      expect(leaf.value.toBigInt()).toBe(100n);

      // query tests
      // const leafByPath = tree.linkedStore.findLeafByPath(5n);
      //
      // expectDefined(leafByPath);
      // expect(leafByPath.leaf.path.toBigInt()).toBe(5n);
      // expect(leafByPath.leafIndex).toBe(1n);
    })

    it("should increment nextUsableIndex", () => {
      const nextUsableIndex = tree.linkedStore.getNextUsableIndex();

      expect(nextUsableIndex).toBe(2n);
    })

    it("should update previous leaf in linkedStore", () => {
      const leaf = tree.linkedStore.getLeaf(0n);

      expectDefined(leaf)
      // Check that the 0 leaf now points to the leaf with path 5 (index 1)
      expect(leaf.next.toBigInt()).toBe(1n);

      expect(leaf.path.toBigInt()).toBe(0n);
    })

    it("should update previous leaf in tree", () => {
      const leaf = tree.linkedStore.getLeaf(0n);

      const zero = ProvableLinkedMerkleTreeLeaf.zero();
      zero.next = Field(1);

      expect(tree.getNode(0, 0n).toBigInt()).toBe(zero.treeValue().toBigInt())
    })

    it("should update new leaf in tree", () => {
      const leaf = new ProvableLinkedMerkleTreeLeaf({
        path: Field(5),
        value: Field(100),
        next: Field(Field.ORDER - 1n)
      });
      const node = tree.getNode(0, 1n);
      expect(node.toBigInt()).toBe(leaf.treeValue().toBigInt());
    })
  })

  // describe("search functions", () => {
  //
  // })
  //
  // describe("witnesses", () => {});
});
