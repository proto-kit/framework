import "reflect-metadata";
import { Bool, Field, Poseidon, Proof } from "snarkyjs";
import { container as globalContainer, type DependencyContainer } from "tsyringe";
import { MethodPublicInput } from "@yab/module";

import { BlockProver, BlockProverPublicInput, type BlockProverState } from "../prover/block/BlockProver.js";
import { StateTransitionProverPublicInput } from "../prover/statetransition/StateTransitionProver.js";
import { NoOpStateTransitionWitnessProvider } from "../prover/statetransition/StateTransitionWitnessProvider.js";

describe("blockProver", () => {
  let container: DependencyContainer;

  beforeEach(() => {
    const childContainer = globalContainer.createChildContainer();
    childContainer.register("StateTransitionWitnessProvider", NoOpStateTransitionWitnessProvider);
    container = childContainer;
  });

  function generateTestProofs(
    fromStateRoot: Field,
    toStateRoot: Field
  ): [Proof<MethodPublicInput>, Proof<StateTransitionProverPublicInput>] {
    const transactionHash = Poseidon.hash([Field(12_345)]);
    const sthash = Field(123);

    const appProof = new Proof<MethodPublicInput>({
      publicInput: new MethodPublicInput({
        transactionHash,
        stateTransitionsHash: sthash,
        status: Bool(true),
      }),

      proof: "",
      maxProofsVerified: 2,
    });

    const stProof = new Proof<StateTransitionProverPublicInput>({
      publicInput: new StateTransitionProverPublicInput({
        fromStateTransitionsHash: Field(0),
        toStateTransitionsHash: sthash,
        fromStateRoot,
        toStateRoot,
      }),

      proof: "",
      maxProofsVerified: 2,
    });

    return [appProof, stProof];
  }

  it("should pass with valid inputs", () => {
    expect.assertions(0);

    const blockProver = container.resolve(BlockProver);

    const fromState = Field(1);
    const toState = Field(2);

    const [appProof, stProof] = generateTestProofs(fromState, toState);

    const state: BlockProverState = {
      stateRoot: fromState,
      transactionHash: Field(0),
    };
    blockProver.applyTransaction(state, stProof, appProof);
  });

  it("previously applied transaction should also pass with derived publicInputs", () => {
    expect.assertions(0);

    const blockProver = container.resolve(BlockProver);

    const fromState = Field(1);
    const toState = Field(2);

    const [appProof, stProof] = generateTestProofs(fromState, toState);

    const fromProverState: BlockProverState = {
      stateRoot: fromState,
      transactionHash: Field(0),
    };
    const toProverState = { ...fromProverState };
    blockProver.applyTransaction(toProverState, stProof, appProof);

    const publicInput = new BlockProverPublicInput({
      fromStateRoot: fromProverState.stateRoot,
      toStateRoot: toProverState.stateRoot,
      fromTransactionsHash: fromProverState.transactionHash,
      toTransactionsHash: toProverState.transactionHash,
    });

    blockProver.proveTransaction(publicInput, stProof, appProof);
  });
});
