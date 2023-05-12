import { Bool, Field, Poseidon, Proof } from "snarkyjs";
import {
  BlockProver,
  BlockProverState
} from "../prover/block/BlockProver.js";
import {
  StateTransitionProverState
} from "../prover/statetransition/StateTransitionProver.js";
import { NoOpStateTransitionWitnessProvider } from "../prover/statetransition/StateTransitionWitnessProvider.js";
import { container as globalContainer, type DependencyContainer } from "tsyringe";
import { AppChainProof, AppChainProofPublicInput } from "../prover/block/AppChainProof.js";

describe("blockProver", () => {

  let container: DependencyContainer;

  beforeEach(() => {
    const childContainer = globalContainer.createChildContainer();
    childContainer.register("StateTransitionWitnessProvider", NoOpStateTransitionWitnessProvider);
    container = childContainer;
  });

  function generateTestProofs(fromStateRoot: Field, toStateRoot: Field): [AppChainProof, Proof<StateTransitionProverState, StateTransitionProverState>] {

    const transactionHash = Poseidon.hash([Field(12_345)]);
    const sthash = Field(123);

    const appProof = new AppChainProof({
      publicOutput: new AppChainProofPublicInput({
        transactionHash,
        stateTransitionsHash: sthash,
        status: Bool(true)
      }),
      publicInput: undefined,

      proof: "",
      maxProofsVerified: 2
    });

    const stProof = new Proof<StateTransitionProverState, StateTransitionProverState>({
      publicInput: new StateTransitionProverState({
        stateTransitionsHash: Field(0),
        stateRoot: fromStateRoot
      }),
      publicOutput: new StateTransitionProverState({
        stateTransitionsHash: sthash,
        stateRoot: toStateRoot
      }),

      proof: "",
      maxProofsVerified: 2
    });

    return [appProof, stProof];
  }

  it("should pass with valid inputs", () => {

    expect.assertions(0)

    const blockProver = container.resolve(BlockProver);

    const fromState = Field(1);
    const toState = Field(2);

    const [appProof, stProof] = generateTestProofs(fromState, toState);

    const fromProverState: BlockProverState = {
      stateRoot: fromState,
      transactionsHash: Field(0)
    };
    const toProverState = { ...fromProverState};
    blockProver.applyTransaction(
      toProverState,
      stProof,
      appProof
    );

    const publicInput = new BlockProverState({
      stateRoot: fromProverState.stateRoot,
      transactionsHash: fromProverState.transactionsHash
    });

    const publicOutput = new BlockProverState({
      stateRoot: toProverState.stateRoot,
      transactionsHash: toProverState.transactionsHash
    })

    let output = blockProver.applyTransaction(publicInput, stProof, appProof);

    expect(output.stateRoot).toEqual(publicOutput.stateRoot)
    expect(output.transactionsHash).toEqual(publicOutput.transactionsHash)

  });

});