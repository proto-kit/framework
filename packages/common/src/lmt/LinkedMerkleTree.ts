import { Field, Poseidon, Struct } from "o1js";

import {
  createMerkleTree,
} from "../trees/RollupMerkleTree";

import { LinkedMerkleTreeStore } from "./LinkedMerkleTreeStore";

export interface LinkedMerkleTreeLeaf {
  path: Field;
  next: Field;
  value: Field;

  treeValue: () => Field;
}

export class ProvableLinkedMerkleTreeLeaf
  extends Struct({
    path: Field,
    next: Field,
    value: Field,
  })
  implements LinkedMerkleTreeLeaf
{
  public static zero() {
    return new ProvableLinkedMerkleTreeLeaf({
      path: Field(0),
      value: Field(0),
      next: Field(Field.ORDER - 1n),
    })
  }

  public treeValue() {
    const { path, next, value } = this;
    return Poseidon.hash([path, next, value]);
  }
}

export class LinkedMerkleTreeRoot extends Struct({
  root: Field,
  maxLeafIndex: Field,
}) {
  public hash() {
    return Poseidon.hash(LinkedMerkleTreeRoot.toFields(this));
  }
}

export type LinkedMerkleTreeRecord = Record<string, LinkedMerkleTreeLeaf>;

export class LinkedMerkleTree extends createMerkleTree(16) {
  public constructor(public readonly linkedStore: LinkedMerkleTreeStore) {
    super(linkedStore);
    this.setLinkedLeaf(
      0n,
      ProvableLinkedMerkleTreeLeaf.zero()
    );
    this.linkedStore.setNextUsableIndex(1n);
  }

  private initialize() {
    // Set empty state
    // (node at path 0 with next = Max-value, nextUsableIndex = 1)
  }

  private setLinkedLeaf(index: bigint, leaf: LinkedMerkleTreeLeaf) {
    this.setLeaf(index, leaf.treeValue());
    this.linkedStore.setLeaf(index, leaf);
  }

  public writeValueToPath(path: bigint, value: Field) {
    const leaf = this.linkedStore.findLeafByPath(path);

    let currIndex: bigint;
    let currNext: bigint;

    let previousWitness: LinkedMerkleTreeWitness;

    if (leaf === undefined) {
      // If we can't find the leaf for 'path', we need to relink the next
      // lowest leaf
      const previous = this.linkedStore.findPreviousByPath(path);

      if (previous === undefined) {
        throw new Error(
          "Can't find previous leaf, something is wrong with the LinkedMerkleTreeStore"
        );
      }

      const nextUsableIndex = this.linkedStore.getNextUsableIndex();

      const previousTreeWitness = this.getWitness(previous.leafIndex);

      const leaf = new ProvableLinkedMerkleTreeLeaf({
        path: previous.leaf.path,
        value: previous.leaf.value,
        next: Field(nextUsableIndex),
      });
      this.setLinkedLeaf(previous.leafIndex, leaf);

      currIndex = nextUsableIndex;
      currNext = previous.leaf.next.toBigInt();
      previousWitness = new LinkedMerkleTreeWitness({
        treeWitness: previousTreeWitness,
        value: leaf,
      });

      this.linkedStore.setNextUsableIndex(nextUsableIndex + 1n);
    } else {
      currIndex = leaf.leafIndex;
      currNext = leaf.leaf.next.toBigInt();
      previousWitness = LinkedMerkleTreeWitness.dummy();
    }

    const currTreeWitness = this.getWitness(currIndex);
    const curr = new ProvableLinkedMerkleTreeLeaf({
      path: Field(path),
      value,
      next: Field(currNext),
    });

    this.setLinkedLeaf(currIndex, curr);

    return new LinkedMerkleTreeOperationWitness({
      auxilaryWitness: previousWitness,
      witness: new LinkedMerkleTreeWitness({
        treeWitness: currTreeWitness,
        value: curr,
      }),
    });
  }
}

export class LinkedMerkleTreeWitness extends Struct({
  treeWitness: LinkedMerkleTree.WITNESS,
  value: ProvableLinkedMerkleTreeLeaf,
}) {
  static dummy() {
    return new LinkedMerkleTreeWitness({
      treeWitness: LinkedMerkleTree.WITNESS.dummy(),
      value: new ProvableLinkedMerkleTreeLeaf({
        value: Field(0),
        next: Field(0),
        path: Field(0),
      }),
    });
  }
}

export class LinkedMerkleTreeOperationWitness extends Struct({
  witness: LinkedMerkleTreeWitness,
  auxilaryWitness: LinkedMerkleTreeWitness,
}) {}

export class LinkedMerkleTreeUtils {
  public static proveStateAction(
    operation: LinkedMerkleTreeOperationWitness,
    value: Field
  ) {}
}
