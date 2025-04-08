import { Bool, Field, Provable, Struct } from "o1js";

import { LinkedMerkleTreeWitness } from "./LinkedMerkleTree";
import {
  LinkedLeafStruct,
  LinkedMerkleTreeGlobalState,
} from "./LinkedMerkleTreeTypes";

/* eslint-disable no-inner-declarations */
// TODO
export class MonadBool extends Struct({
  b: Bool,
  metadata: String,
}) {
  and(bool2: Bool, msg: string): MonadBool {
    const result = this.b.and(bool2);
    let metadata: string = this.metadata;
    Provable.asProver(() => {
      if (!bool2.toBoolean()) {
        metadata = metadata + (metadata.length > 0 ? "\n" : "") + msg;
      }
    });
    return new MonadBool({
      b: result,
      metadata,
    });
  }

  static from(b: Bool) {
    return new MonadBool({ b, metadata: "" });
  }
}

export type TreeWrite = {
  path: Field;
  from: Field;
  to: Field;
};

export namespace LinkedMerkleTreeCircuitOps {
  export class LinkedMerkleTreeGlobalStateWithoutRoot
    extends Struct({
      lastOccupiedIndex: Field,
    })
    implements Omit<LinkedMerkleTreeGlobalState, "root"> {}

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
    update: LinkedMerkleTreeGlobalStateWithoutRoot,
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
    state: LinkedMerkleTreeGlobalState,
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
      update: {
        lastOccupiedIndex: state.lastOccupiedIndex,
      },
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
    state: LinkedMerkleTreeGlobalState,
    witness: LinkedMerkleTreeWitness,
    { path, to }: TreeWrite
  ): ComputeRootInstruction {
    const { leafPrevious: previous, leafCurrent: current } = witness;

    const nextFreeIndex = state.lastOccupiedIndex.add(1);

    const allChecksMet = boolAllTrue(
      // Already covered in general checks
      // path.equals(current.leaf.path),
      current.leaf.isDummy(),
      previous.leaf.nextPath.greaterThan(path),
      previous.leaf.path.lessThan(path),
      current.merkleWitness.calculateIndex().equals(nextFreeIndex)
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
      update: {
        lastOccupiedIndex: nextFreeIndex,
      },
    };
  }

  function computeRoot(
    witness: LinkedMerkleTreeWitness,
    newPreviousLeaf: LinkedLeafStruct,
    newCurrentLeaf: LinkedLeafStruct,
    isUpdate: Bool,
    isDummyAndUpdate: Bool,
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

    let intermediateRoot = Provable.if(isUpdate, root, root1);

    // TODO Make this Provable.if more efficient
    const leafCurrentLeaf = Provable.if(
      isUpdate,
      leafCurrent.leaf.hash(),
      Field(0)
    );
    leafCurrent.merkleWitness
      .calculateRoot(leafCurrentLeaf)
      .equals(intermediateRoot)
      .or(isDummyAndUpdate)
      .assertTrue("Current leaf witness invalid");

    return leafCurrent.merkleWitness.calculateRoot(newCurrentLeaf.hash());
  }

  export function applyTreeWrite(
    state: LinkedMerkleTreeGlobalState,
    witness: LinkedMerkleTreeWitness,
    treeWrite: TreeWrite,
    index: number
  ): LinkedMerkleTreeGlobalState {
    const { leafPrevious, leafCurrent } = witness;

    const isUpdate = leafPrevious.leaf.isDummy();
    const isDummy = leafCurrent.leaf.isDummy().and(isUpdate);

    // For read-only and update
    const updateState = update(state, witness, treeWrite);

    // For insert
    const insertState = insert(state, witness, treeWrite);

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
      state.root
    );

    const updatedState = {
      root: newRoot,
      lastOccupiedIndex: instruction.update.lastOccupiedIndex,
    };
    return Provable.if(
      isDummy,
      LinkedMerkleTreeGlobalState,
      state,
      updatedState
    );
  }
}

/* eslint-enable no-inner-declarations */
