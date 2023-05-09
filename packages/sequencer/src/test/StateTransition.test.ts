import { Bool, Field, isReady, shutdown } from "snarkyjs";
import { RollupMerkleTree, type RollupMerkleWitness } from "../prover/utils/RollupMerkleTree.js";
import { Option, ProvableStateTransition } from "../prover/statetransition/StateTransition.js";
import { container } from "tsyringe";
import {
  StateTransitionProver
} from "../prover/statetransition/StateTransitionProver.js";
import { MemoryMerkleTreeStorage } from "../prover/utils/MemoryMerkleTreeStorage.js";
import { DefaultProvableMerkleList } from "../prover/utils/ProvableMerkleList.js";
import type { StateTransitionWitnessProvider } from "../prover/statetransition/StateTransitionWitnessProvider.js";
import { StateTransitionProvableBatch } from "../prover/statetransition/StateTransitionProvableBatch.js";

describe("stateTransition", () => {

  beforeAll(async () => {
    await isReady;
  });

  afterAll(() => {
    setTimeout(shutdown, 0);
  });

  async function checkTransitions(tree: RollupMerkleTree, transitions: ProvableStateTransition[]) {

    const batch = StateTransitionProvableBatch.fromTransitions(transitions);

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const temporaryTree = new RollupMerkleTree(tree.store.virtualize() as MemoryMerkleTreeStorage);
    const startRoot = temporaryTree.getRoot();

    const hashList = new DefaultProvableMerkleList();

    batch.batch.forEach(x => {
      if (x.to.isSome.toBoolean()) {
        temporaryTree.setLeaf(x.path.toBigInt(), x.to.value);
      }
      hashList.push(x.hash());
    });

    const endRoot = temporaryTree.getRoot();

    class DummySTWP implements StateTransitionWitnessProvider {

      private i = 0;

      public constructor(private readonly witnessTree: RollupMerkleTree) {}

      public getWitness(key: Field): RollupMerkleWitness {
        const witness = this.witnessTree.getWitness(key.toBigInt());
        const set = batch.batch[this.i];
        if (set.to.isSome.toBoolean()) {
          this.witnessTree.setLeaf(key.toBigInt(), set.to.value);
        }
        this.i += 1;
        return witness;
      }
    }

    const childContainer = container.createChildContainer();
    childContainer.registerInstance("StateTransitionWitnessProvider", new DummySTWP(tree));
    const prover = childContainer.resolve(StateTransitionProver);

    const state = prover.applyTransitions(startRoot, Field(0), batch);

    expect(state.stateRoot).toEqual(endRoot);
    expect(state.stateTransitionList.commitment).toEqual(hashList.commitment);

    await childContainer.dispose();

  }

  it("should pass without throwing", async () => {

    const tree = new RollupMerkleTree(new MemoryMerkleTreeStorage());

    tree.setLeaf(1n, Option.value(Field(1), Field).treeValue); // Is ignored because overwritten by first transition
    tree.setLeaf(2n, Option.value(Field(5), Field).treeValue);

    const transitions = [
      new ProvableStateTransition({
        from: Option.none(),
        to: Option.from(Bool(true), Field(14), Field).toProvable(),
        path: Field(1)
      }),
      new ProvableStateTransition({
        from: Option.from(Bool(true), Field(14), Field).toProvable(),
        to: Option.from(Bool(true), Field(4), Field).toProvable(),
        path: Field(1)
      }),
      new ProvableStateTransition({
        from: Option.from(Bool(true), Field(5), Field).toProvable(),
        to: Option.from(Bool(true), Field(2), Field).toProvable(),
        path: Field(2)
      }),
      new ProvableStateTransition({
        from: Option.from(Bool(true), Field(2), Field).toProvable(),
        to: Option.none(),
        path: Field(2)
      })
    ];

    await checkTransitions(tree, transitions);

  });

  it("should throw because of failing precondition", async () => {

    const tree = new RollupMerkleTree(new MemoryMerkleTreeStorage());

    tree.setLeaf(1n, Option.value(Field(1), Field).treeValue); // Is ignored because overwritten by first transition
    tree.setLeaf(2n, Option.value(Field(5), Field).treeValue);

    const transitions = [
      new ProvableStateTransition({ // success
        from: Option.from(Bool(true), Field(1), Field).toProvable(),
        to: Option.from(Bool(true), Field(14), Field).toProvable(),
        path: Field(1)
      }),
      new ProvableStateTransition({ // fail
        from: Option.from(Bool(true), Field(6), Field).toProvable(),
        to: Option.none(),
        path: Field(2)
      })
    ];

    await expect(checkTransitions(tree, transitions)).rejects.toThrow("MerkleWitness not valid for StateTransition (1)");

  });

});