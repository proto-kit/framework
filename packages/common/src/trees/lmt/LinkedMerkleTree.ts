// eslint-disable-next-line max-classes-per-file
import { Bool, Field, Poseidon, Provable, Struct } from "o1js";

import { TypedClass } from "../../types";
import { range } from "../../utils";

import { LinkedMerkleTreeStore } from "./LinkedMerkleTreeStore";
import {
  AbstractMerkleWitness,
  createMerkleTree,
  maybeSwap,
} from "../sparse/RollupMerkleTree";
import { InMemoryLinkedMerkleLeafStore } from "./InMemoryLinkedMerkleLeafStore";

const RollupMerkleTreeWitness = createMerkleTree(40).WITNESS;
export class LinkedLeafStruct extends Struct({
  value: Field,
  path: Field,
  nextPath: Field,
}) {
  public hash(): Field {
    return Poseidon.hash(LinkedLeafStruct.toFields(this));
  }
}

// We use the RollupMerkleTreeWitness here, although we will actually implement
// the RollupMerkleTreeWitnessV2 defined below when instantiating the class.
export class LinkedLeafAndMerkleWitness extends Struct({
  leaf: LinkedLeafStruct,
  merkleWitness: RollupMerkleTreeWitness,
}) {}

class LinkedStructTemplate extends Struct({
  leafPrevious: LinkedLeafAndMerkleWitness,
  leafCurrent: LinkedLeafAndMerkleWitness,
}) {}

export interface AbstractLinkedMerkleWitness extends LinkedStructTemplate {}

export interface AbstractLinkedMerkleTree {
  store: LinkedMerkleTreeStore;
  /**
   * Returns a node which lives at a given index and level.
   * @param level Level of the node.
   * @param index Index of the node.
   * @returns The data of the node.
   */
  getNode(level: number, index: bigint): Field;

  /**
   * Returns the root of the [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree).
   * @returns The root of the Merkle Tree.
   */
  getRoot(): Field;

  /**
   * Sets the value of a leaf node at a given index to a given value.
   * @param path of the leaf node.
   * @param value New value.
   */
  setLeaf(path: bigint, value?: bigint): LinkedMerkleTreeWitness;

  /**
   * Returns a leaf which lives at a given path.
   * Errors otherwise.
   * @param path Index of the node.
   * @returns The data of the leaf.
   */
  getLeaf(path: bigint): LinkedLeafStruct | undefined;

  /**
   * Returns the witness (also known as
   * [Merkle Proof or Merkle Witness](https://computersciencewiki.org/index.php/Merkle_proof))
   * for the leaf at the given path.
   * @param path Position of the leaf node.
   * @returns The witness that belongs to the leaf.
   */
  getWitness(path: bigint): LinkedLeafAndMerkleWitness;

  dummyWitness(): LinkedMerkleTreeWitness;

  dummy(): LinkedLeafAndMerkleWitness;
}

export interface AbstractLinkedMerkleTreeClass {
  new (store: LinkedMerkleTreeStore): AbstractLinkedMerkleTree;

  WITNESS: TypedClass<AbstractLinkedMerkleWitness> &
    typeof LinkedStructTemplate;

  HEIGHT: number;

  EMPTY_ROOT: bigint;
}

export function createLinkedMerkleTree(
  height: number
): AbstractLinkedMerkleTreeClass {
  class LinkedMerkleWitness
    extends LinkedStructTemplate
    implements AbstractLinkedMerkleWitness {}
  /**
   * The {@link RollupMerkleWitness} class defines a circuit-compatible base class
   * for [Merkle Witness'](https://computersciencewiki.org/index.php/Merkle_proof).
   */
  // We define the RollupMerkleWitness again here as we want it to have the same height
  // as the tree. If we re-used the Witness from the RollupMerkleTree.ts we wouldn't have
  // control, whilst having the overhead of creating the RollupTree, since the witness is
  // defined from the tree (for the height reason already described).
  class RollupMerkleWitnessV2
    extends Struct({
      path: Provable.Array(Field, height - 1),
      isLeft: Provable.Array(Bool, height - 1),
    })
    implements AbstractMerkleWitness
  {
    public static height = height;

    public height(): number {
      return RollupMerkleWitnessV2.height;
    }

    /**
     * Calculates a root depending on the leaf value.
     * @param leaf Value of the leaf node that belongs to this Witness.
     * @returns The calculated root.
     */
    public calculateRoot(leaf: Field): Field {
      let hash = leaf;
      const n = this.height();

      for (let index = 1; index < n; ++index) {
        const isLeft = this.isLeft[index - 1];

        const [left, right] = maybeSwap(isLeft, hash, this.path[index - 1]);
        hash = Poseidon.hash([left, right]);
      }

      return hash;
    }

    /**
     * Calculates the index of the leaf node that belongs to this Witness.
     * @returns Index of the leaf.
     */
    public calculateIndex(): Field {
      let powerOfTwo = Field(1);
      let index = Field(0);
      const n = this.height();

      for (let i = 1; i < n; ++i) {
        index = Provable.if(this.isLeft[i - 1], index, index.add(powerOfTwo));
        powerOfTwo = powerOfTwo.mul(2);
      }

      return index;
    }

    public checkMembership(root: Field, key: Field, value: Field): Bool {
      const calculatedRoot = this.calculateRoot(value);
      const calculatedKey = this.calculateIndex();
      // We don't have to range-check the key, because if it would be greater
      // than leafCount, it would not match the computedKey
      key.assertEquals(calculatedKey, "Keys of MerkleWitness does not match");
      return root.equals(calculatedRoot);
    }

    public checkMembershipSimple(root: Field, value: Field): Bool {
      const calculatedRoot = this.calculateRoot(value);
      return root.equals(calculatedRoot);
    }

    public checkMembershipGetRoots(
      root: Field,
      key: Field,
      value: Field
    ): [Bool, Field, Field] {
      const calculatedRoot = this.calculateRoot(value);
      const calculatedKey = this.calculateIndex();
      key.assertEquals(calculatedKey, "Keys of MerkleWitness does not match");
      return [root.equals(calculatedRoot), root, calculatedRoot];
    }

    public toShortenedEntries() {
      return range(0, 5)
        .concat(range(this.height() - 4, this.height()))
        .map((index) =>
          [
            this.path[index].toString(),
            this.isLeft[index].toString(),
          ].toString()
        );
    }

    public static dummy() {
      return new RollupMerkleWitnessV2({
        isLeft: Array<Bool>(this.height - 1).fill(Bool(false)),
        path: Array<Field>(this.height - 1).fill(Field(0)),
      });
    }
  }
  return class AbstractLinkedRollupMerkleTree
    implements AbstractLinkedMerkleTree
  {
    public static HEIGHT = height;

    public static EMPTY_ROOT = new AbstractLinkedRollupMerkleTree(
      new InMemoryLinkedMerkleLeafStore()
    )
      .getRoot()
      .toBigInt();

    public static WITNESS = LinkedMerkleWitness;

    readonly zeroes: bigint[];

    readonly store: LinkedMerkleTreeStore;

    public constructor(store: LinkedMerkleTreeStore) {
      this.store = store;
      this.zeroes = [0n];
      for (
        let index = 1;
        index < AbstractLinkedRollupMerkleTree.HEIGHT;
        index += 1
      ) {
        const previousLevel = Field(this.zeroes[index - 1]);
        this.zeroes.push(
          Poseidon.hash([previousLevel, previousLevel]).toBigInt()
        );
      }
      // We only do the leaf initialisation when the store
      // has no values. Otherwise, we leave the store
      // as is to not overwrite any data.
      if (this.store.getMaximumIndex() === undefined) {
        this.setLeafInitialisation();
      }
    }

    public getNode(level: number, index: bigint): Field {
      const node = this.store.getNode(index, level);
      return Field(node ?? this.zeroes[level]);
    }

    /**
     * Returns leaf which lives at a given path.
     * Errors if the path is not defined.
     * @param path path of the node.
     * @returns The data of the node.
     */
    public getLeaf(path: bigint): LinkedLeafStruct | undefined {
      const storedLeaf = this.store.getLeaf(path);
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
      return this.getNode(
        AbstractLinkedRollupMerkleTree.HEIGHT - 1,
        0n
      ).toConstant();
    }

    private setNode(level: number, index: bigint, value: Field) {
      this.store.setNode(index, level, value.toBigInt());
    }

    /**
     * Sets the value of a leaf node at a given index to a given value
     * and carry the change through to the tree.
     * @param index Position of the leaf node.
     * @param leaf New value.
     */
    private setMerkleLeaf(index: bigint, leaf: LinkedLeafStruct) {
      this.setNode(0, index, leaf.hash());
      let tempIndex = index;
      for (
        let level = 1;
        level < AbstractLinkedRollupMerkleTree.HEIGHT;
        level += 1
      ) {
        tempIndex /= 2n;
        const leftPrev = this.getNode(level - 1, tempIndex * 2n);
        const rightPrev = this.getNode(level - 1, tempIndex * 2n + 1n);
        this.setNode(level, tempIndex, Poseidon.hash([leftPrev, rightPrev]));
      }
    }

    /**
     * Sets the value of a node at a given index to a given value.
     * @param path Position of the leaf node.
     * @param value New value.
     */
    public setLeaf(path: bigint, value?: bigint): LinkedMerkleWitness {
      if (value === undefined) {
        return new LinkedMerkleWitness({
          leafPrevious: this.dummy(),
          leafCurrent: this.getWitness(path),
        });
      }
      const storedLeaf = this.store.getLeaf(path);
      const prevLeaf = this.store.getLeafLessOrEqual(path);
      if (prevLeaf === undefined) {
        throw Error("Prev leaf shouldn't be undefined");
      }
      let witnessPrevious;
      let index: bigint;
      if (storedLeaf === undefined) {
        // The above means the path doesn't already exist, and we are inserting, not updating.
        // This requires us to update the node with the previous path, as well.
        const tempIndex = this.store.getMaximumIndex();
        if (tempIndex === undefined) {
          throw Error("Store Max Index not defined");
        }
        if (tempIndex + 1n >= 2 ** height) {
          throw new Error("Index greater than maximum leaf number");
        }
        witnessPrevious = this.getWitness(prevLeaf.leaf.path);
        const newPrevLeaf = {
          value: prevLeaf.leaf.value,
          path: prevLeaf.leaf.path,
          nextPath: path,
        };
        this.store.setLeaf(prevLeaf.index, newPrevLeaf);
        this.setMerkleLeaf(
          prevLeaf.index,
          new LinkedLeafStruct({
            value: Field(newPrevLeaf.value),
            path: Field(newPrevLeaf.path),
            nextPath: Field(newPrevLeaf.nextPath),
          })
        );

        index = tempIndex + 1n;
      } else {
        witnessPrevious = this.dummy();
        index = storedLeaf.index;
      }
      const newLeaf = {
        value: value,
        path: path,
        nextPath: prevLeaf.leaf.nextPath,
      };
      const witnessNext = this.getWitness(newLeaf.path);
      this.store.setLeaf(index, newLeaf);
      this.setMerkleLeaf(
        index,
        new LinkedLeafStruct({
          value: Field(newLeaf.value),
          path: Field(newLeaf.path),
          nextPath: Field(newLeaf.nextPath),
        })
      );
      return new LinkedMerkleWitness({
        leafPrevious: witnessPrevious,
        leafCurrent: witnessNext,
      });
    }

    /**
     * Sets the value of a leaf node at initialisation,
     * i.e.  {vale: 0, path: 0, nextPath: Field.Max}
     */
    private setLeafInitialisation() {
      // This is the maximum value of the hash
      const MAX_FIELD_VALUE: bigint = Field.ORDER - 1n;
      this.store.setLeaf(0n, {
        value: 0n,
        path: 0n,
        nextPath: MAX_FIELD_VALUE,
      });
      // We now set the leafs in the merkle tree to cascade the values up
      // the tree.
      this.setMerkleLeaf(
        0n,
        new LinkedLeafStruct({
          value: Field(0n),
          path: Field(0n),
          nextPath: Field(MAX_FIELD_VALUE),
        })
      );
    }

    /**
     * Returns the witness (also known as
     * [Merkle Proof or Merkle Witness](https://computersciencewiki.org/index.php/Merkle_proof))
     * for the leaf at the given path, otherwise returns a witness for the first unused index.
     * @param path of the leaf node.
     * @returns The witness that belongs to the leaf.
     */
    public getWitness(path: bigint): LinkedLeafAndMerkleWitness {
      const storedLeaf = this.store.getLeaf(path);
      let leaf;
      let currentIndex: bigint;

      if (storedLeaf === undefined) {
        const storeIndex = this.store.getMaximumIndex();
        if (storeIndex === undefined) {
          throw new Error("Store Undefined");
        }
        currentIndex = storeIndex + 1n;
        leaf = new LinkedLeafStruct({
          value: Field(0),
          path: Field(0),
          nextPath: Field(0),
        });
      } else {
        leaf = new LinkedLeafStruct({
          value: Field(storedLeaf.leaf.value),
          path: Field(storedLeaf.leaf.path),
          nextPath: Field(storedLeaf.leaf.nextPath),
        });
        currentIndex = storedLeaf.index;
      }

      const pathArray = [];
      const isLefts = [];

      for (
        let level = 0;
        level < AbstractLinkedRollupMerkleTree.HEIGHT - 1;
        level += 1
      ) {
        const isLeft = currentIndex % 2n === 0n;
        const sibling = this.getNode(
          level,
          isLeft ? currentIndex + 1n : currentIndex - 1n
        );
        isLefts.push(Bool(isLeft));
        pathArray.push(sibling);
        currentIndex /= 2n;
      }
      return new LinkedLeafAndMerkleWitness({
        merkleWitness: new RollupMerkleWitnessV2({
          path: pathArray,
          isLeft: isLefts,
        }),
        leaf: leaf,
      });
    }

    public dummy(): LinkedLeafAndMerkleWitness {
      return new LinkedLeafAndMerkleWitness({
        merkleWitness: new RollupMerkleTreeWitness({
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          path: Array(40).fill(Field(0)) as Field[],
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          isLeft: Array(40).fill(new Bool(true)) as Bool[],
        }),
        leaf: new LinkedLeafStruct({
          value: Field(0),
          path: Field(0),
          nextPath: Field(0),
        }),
      });
    }

    public dummyWitness() {
      return new LinkedMerkleWitness({
        leafPrevious: this.dummy(),
        leafCurrent: this.dummy(),
      });
    }
  };
}

export class LinkedMerkleTree extends createLinkedMerkleTree(40) {}
export class LinkedMerkleTreeWitness extends LinkedMerkleTree.WITNESS {}
