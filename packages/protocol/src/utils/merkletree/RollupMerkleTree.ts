/* eslint-disable id-length */
/* eslint-disable line-comment-position */
/* eslint-disable no-inline-comments */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Bool, Circuit, Field, Poseidon, Struct } from "snarkyjs";

import { notInCircuit } from "../utils";
import { MerkleTreeStore } from "./MerkleTreeStore";

// external API
// eslint-disable-next-line @typescript-eslint/no-use-before-define
export { RollupMerkleTree, RollupMerkleWitness };

// internal API
// eslint-disable-next-line @typescript-eslint/no-use-before-define
export { maybeSwap };

/**
 * The {@link BaseMerkleWitness} class defines a circuit-compatible base class
 * for [Merkle Witness'](https://computersciencewiki.org/index.php/Merkle_proof).
 */
class RollupMerkleWitness extends Struct({
  path: Circuit.array(Field, 256 - 1),
  isLeft: Circuit.array(Bool, 256 - 1),
}) {
  public static height = 256;

  public height(): number {
    return RollupMerkleWitness.height;
  }

  /**
   * Calculates a root depending on the leaf value.
   * @param leaf Value of the leaf node that belongs to this Witness.
   * @returns The calculated root.
   */
  public calculateRoot(hash: Field): Field {
    const n = this.height();

    for (let index = 1; index < n; ++index) {
      const isLeft = this.isLeft[index - 1];
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
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

    // eslint-disable-next-line no-underscore-dangle
    for (let index_ = 1; index_ < n; ++index_) {
      index = Circuit.if(this.isLeft[index_ - 1], index, index.add(powerOfTwo));
      powerOfTwo = powerOfTwo.mul(2);
    }

    return index;
  }
}

/**
 * A [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree) is a binary tree in
 * which every leaf is the cryptography hash of a piece of data,
 * and every node is the hash of the concatenation of its two child nodes.
 *
 * A Merkle Tree allows developers to easily and securely verify
 * the integrity of large amounts of data.
 *
 * Take a look at our [documentation](https://docs.minaprotocol.com/en/zkapps)
 * on how to use Merkle Trees in combination with zkApps and
 * zero knowledge programming!
 *
 * Levels are indexed from leaves (level 0) to root (level N - 1).
 */
class RollupMerkleTree {
  public static height = 256;

  public static get leafCount(): bigint {
    return 2n ** BigInt(RollupMerkleTree.height - 1);
  }

  private readonly zeroes: bigint[];

  public readonly store: MerkleTreeStore;

  public constructor(store: MerkleTreeStore) {
    this.store = store;
    // eslint-disable-next-line @shopify/prefer-class-properties
    this.zeroes = [0n];
    for (let index = 1; index < RollupMerkleTree.height; index += 1) {
      const previousLevel = Field(this.zeroes[index - 1]);
      this.zeroes.push(
        Poseidon.hash([previousLevel, previousLevel]).toBigInt()
      );
    }
  }

  /**
   * Returns a node which lives at a given index and level.
   * @param level Level of the node.
   * @param index Index of the node.
   * @returns The data of the node.
   */
  @notInCircuit()
  public getNode(level: number, index: bigint): Field {
    return Field(this.store.getNode(index, level) ?? this.zeroes[level]);
  }

  /**
   * Returns the root of the [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree).
   * @returns The root of the Merkle Tree.
   */
  @notInCircuit()
  public getRoot(): Field {
    return this.getNode(RollupMerkleTree.height - 1, 0n);
  }

  // eslint-disable-next-line no-warning-comments
  // TODO: this allows to set a node at an index larger than the size. OK?
  private setNode(level: number, index: bigint, value: Field) {
    this.store.setNode(index, level, value.toBigInt());
  }

  /**
   * TODO: if this is passed an index bigger than the max, it will set a couple
   * of out-of-bounds nodes but not affect the real Merkle root. OK?
   */

  /**
   * Sets the value of a leaf node at a given index to a given value.
   * @param index Position of the leaf node.
   * @param leaf New value.
   */
  @notInCircuit()
  public setLeaf(index: bigint, leaf: Field) {
    if (index >= this.leafCount) {
      index %= this.leafCount;
    }
    this.setNode(0, index, leaf);
    let currentIndex = index;
    for (let level = 1; level < RollupMerkleTree.height; level += 1) {
      currentIndex /= 2n;

      const left = this.getNode(level - 1, currentIndex * 2n);
      const right = this.getNode(level - 1, currentIndex * 2n + 1n);

      this.setNode(level, currentIndex, Poseidon.hash([left, right]));
    }
  }

  /**
   * Returns the witness (also known as
   * [Merkle Proof or Merkle Witness](https://computersciencewiki.org/index.php/Merkle_proof))
   * for the leaf at the given index.
   * @param index Position of the leaf node.
   * @returns The witness that belongs to the leaf.
   */
  @notInCircuit()
  public getWitness(index: bigint): RollupMerkleWitness {
    if (index >= this.leafCount) {
      index %= this.leafCount;
    }
    const path = [];
    const isLefts = [];
    for (let level = 0; level < RollupMerkleTree.height - 1; level += 1) {
      const isLeft = index % 2n === 0n;
      const sibling = this.getNode(level, isLeft ? index + 1n : index - 1n);
      isLefts.push(Bool(isLeft));
      path.push(sibling);
      index /= 2n;
    }
    return new RollupMerkleWitness({
      isLeft: isLefts,
      path,
    });
  }

  // eslint-disable-next-line no-warning-comments, max-len
  // TODO: should this take an optional offset? should it fail if the array is too long?
  /**
   * Fills all leaves of the tree.
   * @param leaves Values to fill the leaves with.
   */
  @notInCircuit()
  public fill(leaves: Field[]) {
    leaves.forEach((value, index) => {
      this.setLeaf(BigInt(index), value);
    });
  }

  /**
   * Returns the amount of leaf nodes.
   * @returns Amount of leaf nodes.
   */
  public get leafCount(): bigint {
    return RollupMerkleTree.leafCount;
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MerkleTreeUtils {
  export function normalizeKey(key: Field): Field {
    // if(NJORD_MERKLE_TREE_HEIGHT < 256){
    //     return fieldMod(key, Field(RollupMerkleTree.leafCount).toConstant())
    // eslint-disable-next-line max-len
    //     // return modPower2(key, RollupMerkleTree.height - 1) //TODO Fix modPower2
    // }else{
    return key;

    // }
  }

  export function checkMembership(
    witness: RollupMerkleWitness,
    root: Field,
    key: Field,
    value: Field
  ): Bool {
    const root2 = witness.calculateRoot(value);
    const key2 = witness.calculateIndex();
    key.assertEquals(key2, "Keys of MerkleWitness does not match");
    return root.equals(root2);
  }

  export function computeRoot(
    witness: RollupMerkleWitness,
    value: Field
  ): Field {
    return witness.calculateRoot(value);
  }
}

/**
 * More efficient version of `maybeSwapBad` which
 * reuses an intermediate variable
 */
function maybeSwap(b: Bool, x: Field, y: Field): [Field, Field] {
  const m = b.toField().mul(x.sub(y)); // b*(x - y)
  const x1 = y.add(m); // y + b*(x - y)
  const y2 = x.sub(m); // x - b*(x - y) = x + b*(y - x)
  return [x1, y2];
}
