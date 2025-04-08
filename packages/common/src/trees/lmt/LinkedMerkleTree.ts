import { Field, Struct } from "o1js";

import { createMerkleTree, RollupMerkleTree } from "../sparse/RollupMerkleTree";
import { MerkleTreeStore } from "../sparse/MerkleTreeStore";
import { InMemoryMerkleTreeStorage } from "../sparse/InMemoryMerkleTreeStorage";

import { InMemoryLinkedLeafStore } from "./InMemoryLinkedLeafStore";
import { LinkedLeaf, LinkedLeafStore } from "./LinkedMerkleTreeStore";
import {
  LinkedLeafStruct,
  LinkedMerkleTreeGlobalState,
} from "./LinkedMerkleTreeTypes";
import {
  AbstractLinkedMerkleTree,
  AbstractLinkedMerkleTreeClass,
} from "./AbstractLinkedMerkleTree";

export function createLinkedMerkleTree(
  height: number
): AbstractLinkedMerkleTreeClass {
  const SparseTreeClass = createMerkleTree(height);

  class LinkedLeafAndMerkleWitness extends Struct({
    leaf: LinkedLeafStruct,
    merkleWitness: SparseTreeClass.WITNESS,
  }) {
    public checkMembership(root: Field, path: Field, value: Field) {
      return this.merkleWitness.checkMembership(
        root,
        path,
        new LinkedLeafStruct({
          ...this.leaf,
          value,
        }).hash()
      );
    }
  }

  class LinkedOperationWitness extends Struct({
    leafPrevious: LinkedLeafAndMerkleWitness,
    leafCurrent: LinkedLeafAndMerkleWitness,
  }) {
    // implements LinkedStructTemplate
    public static fromReadWitness(readWitness: LinkedLeafAndMerkleWitness) {
      return new LinkedOperationWitness({
        leafPrevious: new LinkedLeafAndMerkleWitness({
          merkleWitness: SparseTreeClass.WITNESS.dummy(),
          leaf: LinkedLeafStruct.dummy(),
        }),
        leafCurrent: readWitness,
      });
    }
  }

  return class AbstractLinkedRollupMerkleTree
    implements AbstractLinkedMerkleTree
  {
    public static HEIGHT = height;

    public static EMPTY_ROOT = new AbstractLinkedRollupMerkleTree(
      new InMemoryMerkleTreeStorage(),
      new InMemoryLinkedLeafStore()
    )
      .getRoot()
      .toBigInt();

    public static READ_WITNESS = LinkedLeafAndMerkleWitness;

    public static WITNESS = LinkedOperationWitness;

    readonly tree: RollupMerkleTree;

    readonly leafStore: LinkedLeafStore;

    public constructor(store: MerkleTreeStore, leafStore: LinkedLeafStore) {
      this.leafStore = leafStore;

      this.tree = new SparseTreeClass(store);

      // We only do the leaf initialisation when the store
      // has no values. Otherwise, we leave the store
      // as is to not overwrite any data.
      if (this.leafStore.getMaximumIndex() === undefined) {
        this.setLeafInitialisation();
      }
    }

    /**
     * Returns leaf which lives at a given path.
     * Errors if the path is not defined.
     * @param path path of the node.
     * @returns The data of the node.
     */
    public getLeaf(path: bigint): LinkedLeafStruct | undefined {
      const storedLeaf = this.leafStore.getLeaf(path);
      if (storedLeaf === undefined) {
        return undefined;
      }
      return new LinkedLeafStruct({
        value: Field(storedLeaf.leaf.value),
        path: Field(storedLeaf.leaf.path),
        nextPath: Field(storedLeaf.leaf.nextPath),
      });
    }

    /**
     * Returns the root of the [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree).
     * @returns The root of the Merkle Tree.
     */
    public getRoot(): Field {
      return this.tree.getRoot().toConstant();
    }

    private setMerkleLeaf(index: bigint, leaf: LinkedLeaf) {
      this.leafStore.setLeaf(index, leaf);

      const leafHash = new LinkedLeafStruct(
        LinkedLeafStruct.fromValue(leaf)
      ).hash();
      this.tree.setLeaf(index, leafHash);
    }

    public getGlobalState(): LinkedMerkleTreeGlobalState {
      return new LinkedMerkleTreeGlobalState({
        root: this.getRoot(),
        lastOccupiedIndex: Field(this.leafStore.getMaximumIndex() ?? 0n),
      });
    }

    /**
     * Sets the value of a node at a given index to a given value.
     * @param path Position of the leaf node.
     * @param value New value.
     */
    public setLeaf(path: bigint, value: bigint): LinkedOperationWitness {
      const storedLeaf = this.leafStore.getLeaf(path);
      // const prevLeaf = this.store.getLeafLessOrEqual(path);
      //
      // if (prevLeaf === undefined) {
      //   throw Error("Prev leaf shouldn't be undefined");
      // }

      if (storedLeaf === undefined) {
        // Insert case
        // The above means the path doesn't already exist, and we are inserting, not updating.
        // This requires us to update the node with the previous path, as well.
        const tempIndex = this.leafStore.getMaximumIndex();
        if (tempIndex === undefined) {
          throw Error("Store Max Index not defined");
        }
        if (tempIndex + 1n >= 2 ** height) {
          throw new Error("Index greater than maximum leaf number");
        }
        const nextFreeIndex = tempIndex + 1n;

        const previousLeaf = this.leafStore.getLeafLessOrEqual(path);

        if (previousLeaf === undefined) {
          throw Error("Prev leaf shouldn't be undefined");
        }

        const previousLeafMerkleWitness = this.tree.getWitness(
          previousLeaf.index
        );

        const newPrevLeaf = {
          ...previousLeaf.leaf,
          nextPath: path,
        };
        this.setMerkleLeaf(previousLeaf.index, newPrevLeaf);

        const currentMerkleWitness = this.tree.getWitness(nextFreeIndex);

        const newLeaf = {
          path,
          value,
          nextPath: previousLeaf.leaf.nextPath,
        };
        this.setMerkleLeaf(nextFreeIndex, newLeaf);

        return new LinkedOperationWitness({
          leafPrevious: new LinkedLeafAndMerkleWitness({
            leaf: new LinkedLeafStruct(
              LinkedLeafStruct.fromValue(previousLeaf.leaf)
            ),
            merkleWitness: previousLeafMerkleWitness,
          }),
          leafCurrent: new LinkedLeafAndMerkleWitness({
            leaf: LinkedLeafStruct.dummy(),
            merkleWitness: currentMerkleWitness,
          }),
        });
        // eslint-disable-next-line no-else-return
      } else {
        // Update case
        const witnessPrevious = this.dummyReadWitness();

        // TODO This makes an unnecessary leafstore lookup currently, reuse storedLeaf instead
        const current = this.getReadWitness(storedLeaf.leaf.path);

        this.setMerkleLeaf(storedLeaf.index, {
          ...storedLeaf.leaf,
          value: value,
        });

        return new LinkedOperationWitness({
          leafPrevious: witnessPrevious,
          leafCurrent: current,
        });
      }
    }

    /**
     * Sets the value of a leaf node at initialisation,
     * i.e.  {vale: 0, path: 0, nextPath: Field.Max}
     */
    private setLeafInitialisation() {
      // This is the maximum value of the hash
      const MAX_FIELD_VALUE: bigint = Field.ORDER - 1n;
      this.leafStore.setLeaf(0n, {
        value: 0n,
        path: 0n,
        nextPath: MAX_FIELD_VALUE,
      });
      // We now set the leafs in the merkle tree to cascade the values up
      // the tree.
      this.setMerkleLeaf(0n, {
        value: 0n,
        path: 0n,
        nextPath: MAX_FIELD_VALUE,
      });
    }

    /**
     * Returns the witness (also known as
     * [Merkle Proof or Merkle Witness](https://computersciencewiki.org/index.php/Merkle_proof))
     * for the leaf at the given path, otherwise returns a witness for the first unused index.
     * @param path of the leaf node.
     * @returns The witness that belongs to the leaf.
     */
    public getReadWitness(path: bigint): LinkedLeafAndMerkleWitness {
      const storedLeaf = this.leafStore.getLeaf(path);
      let leaf;
      let currentIndex: bigint;

      if (storedLeaf === undefined) {
        const storeIndex = this.leafStore.getMaximumIndex();
        if (storeIndex === undefined) {
          throw new Error("Store undefined");
        }
        currentIndex = storeIndex + 1n;
        leaf = LinkedLeafStruct.dummy();
      } else {
        leaf = new LinkedLeafStruct(
          LinkedLeafStruct.fromValue(storedLeaf.leaf)
        );
        currentIndex = storedLeaf.index;
      }

      const merkleWitness = this.tree.getWitness(currentIndex);

      return new LinkedLeafAndMerkleWitness({
        merkleWitness,
        leaf,
      });
    }

    public dummyReadWitness(): LinkedLeafAndMerkleWitness {
      return new LinkedLeafAndMerkleWitness({
        merkleWitness: SparseTreeClass.WITNESS.dummy(),
        leaf: LinkedLeafStruct.dummy(),
      });
    }

    public dummyWitness() {
      return new LinkedOperationWitness({
        leafPrevious: this.dummyReadWitness(),
        leafCurrent: this.dummyReadWitness(),
      });
    }
  };
}

export class LinkedMerkleTree extends createLinkedMerkleTree(40) {}
export class LinkedMerkleTreeWitness extends LinkedMerkleTree.WITNESS {}
export class LinkedMerkleTreeReadWitness extends LinkedMerkleTree.READ_WITNESS {}
