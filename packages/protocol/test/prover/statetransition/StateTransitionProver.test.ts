import { Bool, Field } from "o1js";
import {
  InMemoryLinkedLeafStore,
  InMemoryMerkleTreeStorage,
  LinkedMerkleTree,
  padArray,
} from "@proto-kit/common";
import { InMemoryAreProofsEnabled } from "@proto-kit/sequencer";

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

  // function applyToTree(
  //   tree: RollupMerkleTree,
  //   batches: StateTransitionProvableBatch[],
  //   indizes: number[]
  // ) {
  //   const flat = batches.flatMap((batch) => batch.batch);
  //   indizes.forEach((index) => {
  //     const st = flat[index].stateTransition;
  //     if (st.to.isSome) {
  //       tree.setLeaf(st.path.toBigInt(), st.to.value);
  //     }
  //   });
  // }

  describe("currentBatchHash", () => {
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

        const tree = new LinkedMerkleTree(
          new InMemoryMerkleTreeStorage(),
          new InMemoryLinkedLeafStore()
        );
        const witness = LinkedMerkleTree.WITNESS.fromReadWitness(
          tree.getReadWitness(1n)
        );

        const result = await prover.proveBatch(
          {
            root: tree.getRoot(),
            witnessedRootsHash: Field(0),
            batchesHash: Field(0),
            currentBatchStateHash: Field(0),
          },
          batch[0],
          {
            witnesses: padArray([witness], 4, () =>
              LinkedMerkleTree.dummyWitness()
            ),
          },
          new AppliedStateTransitionBatchState({
            root: tree.getRoot(),
            batchHash: Field(0),
          })
        );

        expect(result.currentBatchStateHash.toString()).toStrictEqual("0");
      }
    );
  });

  describe("dummies", () => {
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
            root: Field(LinkedMerkleTree.EMPTY_ROOT),
            witnessedRootsHash: Field(0),
            batchesHash: Field(0),
            currentBatchStateHash: Field(0),
          },
          batch[0],
          {
            witnesses: padArray([], 4, () => LinkedMerkleTree.dummyWitness()),
          },
          new AppliedStateTransitionBatchState({
            root: Field(LinkedMerkleTree.EMPTY_ROOT),
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

      const tree = new LinkedMerkleTree(
        new InMemoryMerkleTreeStorage(),
        new InMemoryLinkedLeafStore()
      );

      const inputRoot = tree.getRoot();

      const witness = LinkedMerkleTree.WITNESS.fromReadWitness(
        tree.getReadWitness(1n)
      );
      tree.setLeaf(1n, 2n);
      const witness2 = LinkedMerkleTree.WITNESS.fromReadWitness(
        tree.getReadWitness(2n)
      );

      const prove = async () =>
        await prover.proveBatch(
          {
            root: inputRoot,
            witnessedRootsHash: Field(0),
            batchesHash: Field(0),
            currentBatchStateHash: Field(0),
          },
          batch[0],
          {
            witnesses: [
              witness,
              LinkedMerkleTree.dummyWitness(),
              witness2,
              LinkedMerkleTree.dummyWitness(),
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
  });

  describe("batch progression", () => {
    it("should throw away non-applied batches", async () => {
      const batch = StateTransitionProvableBatch.fromBatches([
        {
          stateTransitions: [
            createST(Field(1), Field(0), Field(2)),
            createST(Field(2), Field(0), Field(3)),
          ],
          applied: Bool(true),
          witnessRoot: Bool(true),
        },
        {
          stateTransitions: [
            createST(Field(2), Field(3), Field(4)),
            createST(Field(2), Field(4), Field(5)),
          ],
          applied: Bool(false),
          witnessRoot: Bool(true),
        },
      ]);

      const tree = new LinkedMerkleTree(
        new InMemoryMerkleTreeStorage(),
        new InMemoryLinkedLeafStore()
      );

      const witness1 = tree.setLeaf(1n, 2n);
      const witness2 = tree.setLeaf(2n, 3n);

      const resultRoot = tree.getRoot();

      const witness3 = tree.setLeaf(2n, 4n);
      const witness4 = tree.setLeaf(2n, 5n);

      const result = await prover.proveBatch(
        {
          root: Field(LinkedMerkleTree.EMPTY_ROOT),
          witnessedRootsHash: Field(0),
          batchesHash: Field(0),
          currentBatchStateHash: Field(0),
        },
        batch[0],
        {
          witnesses: [witness1, witness2, witness3, witness4],
          //   .map((x) =>
          //   LinkedMerkleTree.WITNESS.fromReadWitness(x)
          // ),
        },
        new AppliedStateTransitionBatchState({
          root: Field(LinkedMerkleTree.EMPTY_ROOT),
          batchHash: Field(0),
        })
      );

      expect(result.root.toString()).toStrictEqual(resultRoot.toString());
      expect(result.currentBatchStateHash.toString()).toStrictEqual("0");
    });
  });
});
