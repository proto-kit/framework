import { Bool, Field, Struct } from "o1js";

import { createMerkleTree, RollupMerkleTree } from "../sparse/RollupMerkleTree";
import { TypedClass } from "../../types";
import { MerkleTreeStore } from "../sparse/MerkleTreeStore";

import { LinkedLeafStore } from "./LinkedMerkleTreeStore";
import {
  LinkedLeafStruct,
  LinkedMerkleTreeGlobalState,
} from "./LinkedMerkleTreeTypes";

class RollupMerkleTreeWitness extends createMerkleTree(40).WITNESS {}

type LinkedMerkleWitnessValue = {
  leaf: LinkedLeafStruct;
  merkleWitness: RollupMerkleTreeWitness;
  checkMembership(root: Field, path: Field, value: Field): Bool;
};

// We use the RollupMerkleTreeWitness here, although we will actually implement
// the RollupMerkleTreeWitnessV2 defined below when instantiating the class.
class LinkedMerkleWitnessTemplate extends Struct({
  leaf: LinkedLeafStruct,
  merkleWitness: RollupMerkleTreeWitness,
}) {
  public checkMembership(root: Field, path: Field, value: Field): Bool {
    // Mock implementation for typing
    return Bool(true);
  }
}

type LinkedOperationWitnessValue = {
  leafPrevious: LinkedMerkleWitnessValue;
  leafCurrent: LinkedMerkleWitnessValue;
};

class LinkedOperationWitnessTemplate extends Struct({
  leafPrevious: LinkedMerkleWitnessTemplate,
  leafCurrent: LinkedMerkleWitnessTemplate,
}) {}

export interface AbstractLinkedMerkleTree {
  leafStore: LinkedLeafStore;

  tree: RollupMerkleTree;

  /**
   * Returns the root of the [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree).
   * @returns The root of the Merkle Tree.
   */
  getRoot(): Field;

  getGlobalState(): LinkedMerkleTreeGlobalState;

  /**
   * Sets the value of a leaf node at a given index to a given value.
   * @param path of the leaf node.
   * @param value New value.
   */
  setLeaf(path: bigint, value?: bigint): LinkedOperationWitnessValue;

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
  getReadWitness(path: bigint): LinkedMerkleWitnessValue;

  dummyWitness(): LinkedOperationWitnessValue;

  dummyReadWitness(): LinkedMerkleWitnessValue;
}

export interface AbstractLinkedMerkleTreeClass {
  new (
    store: MerkleTreeStore,
    leafStore: LinkedLeafStore
  ): AbstractLinkedMerkleTree;

  WITNESS: typeof LinkedOperationWitnessTemplate & {
    fromReadWitness(
      readWitness: LinkedMerkleWitnessTemplate
    ): LinkedOperationWitnessTemplate;
  };

  READ_WITNESS: typeof LinkedMerkleWitnessTemplate &
    TypedClass<{
      checkMembership(root: Field, path: Field, value: Field): Bool;
    }>;

  HEIGHT: number;

  EMPTY_ROOT: bigint;
}
