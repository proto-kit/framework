import "reflect-metadata";
import { Bool, Field, Poseidon, Proof } from "snarkyjs";
import {
  container as globalContainer,
  type DependencyContainer,
} from "tsyringe";

import { MethodPublicOutput } from "@proto-kit/protocol";

import {
  BlockProver,
  type BlockProverState,
} from "../src/prover/block/BlockProver.js";
import { NoOpStateTransitionWitnessProvider } from "../src/prover/statetransition/StateTransitionWitnessProvider.js";
import {
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "../src/prover/statetransition/StateTransitionProvable";
import { BlockProverPublicInput } from "../src/prover/block/BlockProvable";

type BlockProverProofPair = [
  Proof<void, MethodPublicOutput>,
  Proof<StateTransitionProverPublicInput, StateTransitionProverPublicOutput>
];

describe("blockProver", () => {
  let container: DependencyContainer;

  beforeEach(() => {
    const childContainer = globalContainer.createChildContainer();
    childContainer.register(
      "StateTransitionWitnessProvider",
      NoOpStateTransitionWitnessProvider
    );
    container = childContainer;
  });

  function generateTestProofs(
    fromStateRoot: Field,
    toStateRoot: Field
  ): BlockProverProofPair {
    const transactionHash = Poseidon.hash([Field(12_345)]);
    const sthash = Field(123);

    const appProof = new Proof<undefined, MethodPublicOutput>({
      publicInput: undefined,
      publicOutput: new MethodPublicOutput({
        transactionHash,
        stateTransitionsHash: sthash,
        status: Bool(true),
      }),

      proof: "",
      maxProofsVerified: 2,
    });

    const stProof = new Proof<
      StateTransitionProverPublicInput,
      StateTransitionProverPublicOutput
    >({
      publicInput: new StateTransitionProverPublicInput({
        stateTransitionsHash: Field(0),
        stateRoot: fromStateRoot,
      }),
      publicOutput: new StateTransitionProverPublicOutput({
        stateTransitionsHash: sthash,
        stateRoot: toStateRoot,
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
      transactionsHash: Field(0),
    };
    blockProver.applyTransaction(state, stProof, appProof);
  });

  it("previously applied transaction should also pass with derived publicInputs", () => {
    expect.assertions(2);

    const blockProver = container.resolve(BlockProver);

    const fromState = Field(1);
    const toState = Field(2);

    const [appProof, stProof] = generateTestProofs(fromState, toState);

    const fromProverState: BlockProverState = {
      stateRoot: fromState,
      transactionsHash: Field(0),
    };
    const toProverState = { ...fromProverState };
    blockProver.applyTransaction(toProverState, stProof, appProof);

    const publicInput = new BlockProverPublicInput({
      stateRoot: fromProverState.stateRoot,
      transactionsHash: fromProverState.transactionsHash,
    });

    const publicOutput = blockProver.proveTransaction(
      publicInput,
      stProof,
      appProof
    );

    expect(publicOutput.stateRoot).toStrictEqual(toProverState.stateRoot);
    expect(publicOutput.transactionsHash).toStrictEqual(
      toProverState.transactionsHash
    );
  });
});
