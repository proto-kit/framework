import "reflect-metadata";
import { InMemoryMerkleTreeStorage } from "@proto-kit/common";
import { Bool, Field } from "o1js";

import { Option, ProvableStateTransition } from "../src/index";
import { RollupMerkleTree } from "../../common/src/trees/RollupMerkleTree.js";

// TODO Not worth fixing rn because we will revamp the STProver very soon

describe.skip("stateTransition", () => {
  async function checkTransitions(
    tree: RollupMerkleTree,
    transitions: ProvableStateTransition[]
  ) {
    // const batch = StateTransitionProvableBatch.fromTransitions(transitions, []);
    //
    // const temporaryTree = new RollupMerkleTree(
    //   new CachedMerkleTreeStore(tree.store)
    // );
    // const startRoot = temporaryTree.getRoot();
    //
    // const hashList = new DefaultProvableHashList(ProvableStateTransition);
    //
    // batch.batch.forEach((item) => {
    //   if (item.to.isSome.toBoolean()) {
    //     temporaryTree.setLeaf(item.path.toBigInt(), item.to.value);
    //   }
    //   hashList.push(item);
    // });
    //
    // const endRoot = temporaryTree.getRoot();
    //
    // class DummySTWP implements StateTransitionWitnessProvider {
    //   private i = 0;
    //
    //   public constructor(private readonly witnessTree: RollupMerkleTree) {}
    //
    //   public getWitness(key: Field): RollupMerkleTreeWitness {
    //     const witness = this.witnessTree.getWitness(key.toBigInt());
    //     const set = batch.batch[this.i];
    //     if (set.to.isSome.toBoolean()) {
    //       this.witnessTree.setLeaf(key.toBigInt(), set.to.value);
    //     }
    //     this.i += 1;
    //     return witness;
    //   }
    // }
    //
    // const childContainer = container.createChildContainer();
    // childContainer.registerInstance(
    //   "StateTransitionWitnessProvider",
    //   new DummySTWP(tree)
    // );
    // const prover = childContainer.resolve(StateTransitionProver);
    //
    // const state = prover.applyTransitions(startRoot, Field(0), batch);
    //
    // expect(state.stateRoot).toStrictEqual(endRoot);
    // expect(state.stateTransitionList.commitment).toStrictEqual(
    //   hashList.commitment
    // );
    //
    // await childContainer.dispose();
  }

  it.each([
    [
      [
        new ProvableStateTransition({
          from: Option.fromValue(Field(1), Field).toProvable(),
          to: Option.fromValue(Field(14), Field).toProvable(),
          path: Field(1),
        }),
        new ProvableStateTransition({
          from: Option.fromValue(Field(14), Field).toProvable(),
          to: Option.fromValue(Field(4), Field).toProvable(),
          path: Field(1),
        }),
      ],
    ],
    [
      [
        new ProvableStateTransition({
          from: Option.none().toProvable(),
          to: Option.from(Bool(true), Field(4), Field).toProvable(),
          path: Field(1),
        }),
        new ProvableStateTransition({
          from: Option.from(Bool(true), Field(5), Field).toProvable(),
          to: Option.from(Bool(true), Field(2), Field).toProvable(),
          path: Field(2),
        }),
        new ProvableStateTransition({
          from: Option.from(Bool(true), Field(2), Field).toProvable(),
          to: Option.none().toProvable(),
          path: Field(2),
        }),
      ],
    ],
  ])("should pass without throwing", async (transitions) => {
    // expect.assertions(2);

    const tree = new RollupMerkleTree(new InMemoryMerkleTreeStorage());

    // Is ignored because overwritten by first transition
    tree.setLeaf(1n, Option.fromValue(Field(1), Field).treeValue);
    tree.setLeaf(2n, Option.fromValue(Field(5), Field).treeValue);

    await checkTransitions(tree, transitions);
  });

  it.each([
    [
      [
        new ProvableStateTransition({
          // fail
          from: Option.from(Bool(true), Field(2), Field).toProvable(),
          to: Option.none().toProvable(),
          path: Field(1),
        }),
      ],
      0,
    ],
    [
      [
        new ProvableStateTransition({
          // success
          from: Option.from(Bool(true), Field(1), Field).toProvable(),
          to: Option.from(Bool(true), Field(14), Field).toProvable(),
          path: Field(1),
        }),
        new ProvableStateTransition({
          // fail
          from: Option.from(Bool(true), Field(6), Field).toProvable(),
          to: Option.none().toProvable(),
          path: Field(2),
        }),
      ],
      1,
    ],
    [
      [
        new ProvableStateTransition({
          // success
          from: Option.from(Bool(true), Field(1), Field).toProvable(),
          to: Option.from(Bool(true), Field(14), Field).toProvable(),
          path: Field(1),
        }),
        new ProvableStateTransition({
          // fail
          from: Option.from(Bool(true), Field(15), Field).toProvable(),
          to: Option.none().toProvable(),
          path: Field(1),
        }),
      ],
      1,
    ],
  ])(
    "should throw because of failing precondition",
    async (transitions, index) => {
      expect.assertions(1);

      const tree = new RollupMerkleTree(new InMemoryMerkleTreeStorage());

      // Is ignored because overwritten by first transition
      tree.setLeaf(1n, Option.fromValue(Field(1), Field).treeValue);
      tree.setLeaf(2n, Option.fromValue(Field(5), Field).treeValue);

      await expect(checkTransitions(tree, transitions)).rejects.toThrow(
        `MerkleWitness not valid for StateTransition (${index})`
      );
    }
  );
});
