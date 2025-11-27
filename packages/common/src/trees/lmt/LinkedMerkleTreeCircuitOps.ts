import { Bool, Field, Provable, Struct } from "o1js";

import { LinkedMerkleTreeWitness } from "./LinkedMerkleTree";
import { LinkedLeafStruct } from "./LinkedMerkleTreeTypes";

/* eslint-disable no-inner-declarations */
// TODO Add a struct that captures the errors monad-style

export type TreeWrite = {
  path: Field;
  from: Field;
  to: Field;
};

export namespace LinkedMerkleTreeCircuitOps {
  function boolAllTrue(...args: Bool[]): Bool {
    return args.reduce((a, b, i) => {
      // if (!b.toBoolean()) {
      //   console.log();
      // }
      return a.and(b);
    });
  }

  export class ComputeRootInstruction extends Struct({
    newPreviousLeaf: LinkedLeafStruct,
    newCurrentLeaf: LinkedLeafStruct,
    allChecksMet: Bool,
  }) {}

  function chooseInstruction(
    isUpdate: Bool,
    updateInstruction: ComputeRootInstruction,
    insertInstruction: ComputeRootInstruction
  ): ComputeRootInstruction {
    return Provable.if(
      isUpdate,
      ComputeRootInstruction,
      updateInstruction,
      insertInstruction
    );
  }

  /**
   * verifyWitness(current.merkleWitness, current.leaf)
   *
   * st.path == current.leaf.path
   * st.from.value == current.leaf.value
   * ```
   *
   * updates:
   * ```
   * current := { current.path, current.nextPath, value: st.to.value }
   */
  function update(
    { leafCurrent, leafPrevious }: LinkedMerkleTreeWitness,
    { to, from, path }: TreeWrite
  ): ComputeRootInstruction {
    const allChecksMet = boolAllTrue(
      path.equals(leafCurrent.leaf.path),
      leafCurrent.leaf.value.equals(from)
    );

    return {
      newPreviousLeaf: leafPrevious.leaf,
      newCurrentLeaf: new LinkedLeafStruct({
        ...leafCurrent.leaf,
        value: to,
      }),
      allChecksMet,
    };
  }

  /**
   * st.path == current.leaf.path
   *
   * previous.leaf.nextPath > current.leaf.path
   * previous.leaf.path < current.leaf.path
   * previous.leaf.nextPath == current.leaf.nextPath
   *
   * index(current.merkleWitness) == nextFreeIndex
   *
   * updates:
   * previous := { previous.path, previous.value, nextPath: current.path }
   * current := current.leaf
   */
  function insert(
    witness: LinkedMerkleTreeWitness,
    { path, to }: TreeWrite
  ): ComputeRootInstruction {
    const { leafPrevious: previous, leafCurrent: current } = witness;

    const allChecksMet = boolAllTrue(
      // Already covered in general checks
      // path.equals(current.leaf.path),
      current.leaf.isDummy(),
      previous.leaf.nextPath.greaterThan(path),
      previous.leaf.path.lessThan(path)
    );

    return {
      newPreviousLeaf: new LinkedLeafStruct({
        ...previous.leaf,
        nextPath: path,
      }),
      newCurrentLeaf: new LinkedLeafStruct({
        path,
        value: to,
        nextPath: previous.leaf.nextPath,
      }),
      allChecksMet,
    };
  }

  function computeRoot(
    witness: LinkedMerkleTreeWitness,
    newPreviousLeaf: LinkedLeafStruct,
    newCurrentLeaf: LinkedLeafStruct,
    isUpdate: Bool,
    isDummy: Bool,
    root: Field
  ) {
    const { leafPrevious, leafCurrent } = witness;

    leafPrevious.merkleWitness
      .calculateRoot(leafPrevious.leaf.hash())
      .equals(root)
      .or(isUpdate)
      .assertTrue("Previous leaf calculation not matching");

    const root1 = leafPrevious.merkleWitness.calculateRoot(
      newPreviousLeaf.hash()
    );

    const intermediateRoot = Provable.if(isUpdate, root, root1);

    // TODO Make this Provable.if more efficient
    const leafCurrentLeaf = Provable.if(
      isUpdate,
      leafCurrent.leaf.hash(),
      Field(0)
    );
    leafCurrent.merkleWitness
      .calculateRoot(leafCurrentLeaf)
      .equals(intermediateRoot)
      .or(isDummy)
      .assertTrue("Current leaf witness invalid");

    return leafCurrent.merkleWitness.calculateRoot(newCurrentLeaf.hash());
  }

  export function applyTreeWrite(
    root: Field,
    witness: LinkedMerkleTreeWitness,
    treeWrite: TreeWrite,
    index: number
  ): Field {
    const { leafPrevious, leafCurrent } = witness;

    const isUpdate = leafPrevious.leaf.isDummy();
    const isDummy = leafCurrent.leaf.isDummy().and(isUpdate);

    // For read-only and update
    const updateState = update(witness, treeWrite);

    // For insert
    const insertState = insert(witness, treeWrite);

    const instruction = chooseInstruction(isUpdate, updateState, insertState);

    instruction.allChecksMet
      .or(isDummy)
      .assertTrue(`Not all witness checks have been met: ${index}`);

    const newRoot = computeRoot(
      witness,
      instruction.newPreviousLeaf,
      instruction.newCurrentLeaf,
      isUpdate,
      isDummy,
      root
    );

    return Provable.if(isDummy, root, newRoot);
  }
}

/* eslint-enable no-inner-declarations */
