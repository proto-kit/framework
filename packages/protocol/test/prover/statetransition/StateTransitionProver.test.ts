import { InMemoryAreProofsEnabled } from "@proto-kit/sdk";
import { Bool, Field } from "o1js";
import {
  InMemoryMerkleTreeStorage,
  padArray,
  RollupMerkleTree,
  RollupMerkleTreeWitness,
} from "@proto-kit/common";

import {
  AppliedStateTransitionBatchState,
  ProvableOption,
  ProvableStateTransition,
  StateTransitionProvableBatch,
  StateTransitionProverProgrammable,
} from "../../../src";

describe("StateTransitionProver", () => {
  let prover: StateTransitionProverProgrammable;

  function setup() {
    prover = new StateTransitionProverProgrammable({
      get areProofsEnabled() {
        return new InMemoryAreProofsEnabled();
      },
    });
  }

  beforeEach(() => {
    setup();
  });

  function createST(path: Field, from: Field, to: Field) {
    return new ProvableStateTransition({
      path,
      from: new ProvableOption({
        isSome: Bool(true),
        value: from,
      }),
      to: new ProvableOption({
        isSome: Bool(true),
        value: to,
      }),
    });
  }

  it.each([
    [true, true],
    [true, false],
    [false, false],
  ])(
    "should retain empty currentBatchHash for padded dummies",
    async (applied, witnessRoot) => {
      const batch = StateTransitionProvableBatch.fromBatches([
        {
          stateTransitions: [createST(Field(1), Field(0), Field(2))],
          applied: Bool(applied),
          witnessRoot: Bool(witnessRoot),
        },
      ]);

      const tree = new RollupMerkleTree(new InMemoryMerkleTreeStorage());

      const witness = tree.getWitness(1n);

      const result = await prover.proveBatch(
        {
          root: tree.getRoot(),
          rootAccumulator: Field(0),
          batchesHash: Field(0),
          currentBatchStateHash: Field(0),
        },
        batch[0],
        {
          witnesses: padArray([witness], 4, () =>
            RollupMerkleTreeWitness.dummy()
          ),
        },
        new AppliedStateTransitionBatchState({
          root: tree.getRoot(),
          batchHash: Field(0),
        })
      );

      tree.setLeaf(1n, Field(2));

      // expect(result.root.toString()).toStrictEqual(tree.getRoot().toString());
      expect(result.currentBatchStateHash.toString()).toStrictEqual("0");
    }
  );

  it("should fail if dummy is type close", async () => {
    expect.assertions(1);

    const batch = StateTransitionProvableBatch.fromBatches([
      {
        stateTransitions: [ProvableStateTransition.dummy()],
        applied: Bool(true),
        witnessRoot: Bool(true),
      },
    ]);

    const prove = async () =>
      await prover.proveBatch(
        {
          root: Field(RollupMerkleTree.EMPTY_ROOT),
          rootAccumulator: Field(0),
          batchesHash: Field(0),
          currentBatchStateHash: Field(0),
        },
        batch[0],
        {
          witnesses: padArray([], 4, RollupMerkleTreeWitness.dummy),
        },
        new AppliedStateTransitionBatchState({
          root: Field(RollupMerkleTree.EMPTY_ROOT),
          batchHash: Field(0),
        })
      );

    await expect(prove).rejects.toThrow(
      /Dummies have to be of type 'nothing'.*/
    );
  });

  it("should fail if dummy is in the middle", async () => {
    expect.assertions(1);

    const batch = StateTransitionProvableBatch.fromBatches([
      {
        stateTransitions: [
          createST(Field(1), Field(0), Field(2)),
          ProvableStateTransition.dummy(),
          createST(Field(2), Field(0), Field(3)),
        ],
        applied: Bool(true),
        witnessRoot: Bool(true),
      },
    ]);

    const tree = new RollupMerkleTree(new InMemoryMerkleTreeStorage());

    const inputRoot = tree.getRoot();

    const witness = tree.getWitness(1n);
    tree.setLeaf(1n, Field(2));
    const witness2 = tree.getWitness(2n);

    const prove = async () =>
      await prover.proveBatch(
        {
          root: inputRoot,
          rootAccumulator: Field(0),
          batchesHash: Field(0),
          currentBatchStateHash: Field(0),
        },
        batch[0],
        {
          witnesses: [
            witness,
            RollupMerkleTreeWitness.dummy(),
            witness2,
            RollupMerkleTreeWitness.dummy(),
          ],
        },
        new AppliedStateTransitionBatchState({
          root: inputRoot,
          batchHash: Field(0),
        })
      );

    await expect(prove).rejects.toThrow(
      /Dummies can only be placed on closed batchLists.*/
    );
  });

  describe("batch progression", () => {
    it("should apply", () => {}); // TODO
  });
});
