import {
  Circuit,
  Experimental,
  Field,
  Proof,
  SelfProof,
  Struct,
} from "snarkyjs";
import { inject, injectable } from "tsyringe";

import {
  MerkleTreeUtils,
  RollupMerkleWitness,
} from "../../utils/merkletree/RollupMerkleTree.js";
import {
  DefaultProvableHashList,
  ProvableHashList,
} from "../../utils/ProvableHashList";
import { ProvableStateTransition } from "../../model/StateTransition";
import { StateTransitionProvableBatch } from "../../model/StateTransitionProvableBatch";
import { constants } from "../../Constants";
import { Subclass, ZkProgramType } from "../../utils/utils";

import { StateTransitionWitnessProvider } from "./StateTransitionWitnessProvider.js";

interface StateTransitionProverState {
  stateRoot: Field;
  stateTransitionList: ProvableHashList<ProvableStateTransition>;
}
export class StateTransitionProverPublicInput extends Struct({
  fromStateTransitionsHash: Field,
  toStateTransitionsHash: Field,
  fromStateRoot: Field,
  toStateRoot: Field,
}) {}

/**
 * StateTransitionProver is the prover that proves the application of some state
 * transitions and checks and updates their merkle-tree entries
 */
@injectable()
export class StateTransitionProver {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  private readonly program = ((instance: StateTransitionProver) =>
    Experimental.ZkProgram({
      publicInput: StateTransitionProverPublicInput,

      methods: {
        proveBatch: {
          privateInputs: [Field, StateTransitionProvableBatch],

          method(
            publicInput: StateTransitionProverPublicInput,
            fromStateRoot: Field,
            batch: StateTransitionProvableBatch
          ) {
            instance.runBatch(publicInput, fromStateRoot, batch);
          },
        },

        merge: {
          privateInputs: [
            SelfProof<StateTransitionProverPublicInput>,
            SelfProof<StateTransitionProverPublicInput>,
          ],

          method(
            publicInput: StateTransitionProverPublicInput,
            proof1: SelfProof<StateTransitionProverPublicInput>,
            proof2: SelfProof<StateTransitionProverPublicInput>
          ) {
            instance.merge(publicInput, proof1, proof2);
          },
        },
      },
    }))(this);

  public constructor(
    @inject("StateTransitionWitnessProvider")
    private readonly witnessProvider: StateTransitionWitnessProvider
  ) {}

  /**
   * Applies the state transitions to the current stateRoot
   * and returns the new prover state
   */
  public applyTransitions(
    stateRoot: Field,
    stateTransitionCommitmentFrom: Field,
    transitionBatch: StateTransitionProvableBatch
  ): StateTransitionProverState {
    const state: StateTransitionProverState = {
      stateRoot,

      stateTransitionList: new DefaultProvableHashList(
        ProvableStateTransition,
        stateTransitionCommitmentFrom
      ),
    };

    const transitions = transitionBatch.batch;
    for (
      let index = 0;
      index < constants.stateTransitionProverBatchSize;
      index++
    ) {
      this.applyTransition(state, transitions[index], index);
    }

    return state;
  }

  /**
   * Applies a single state transition to the given state
   * and mutates it in place
   */
  public applyTransition(
    state: StateTransitionProverState,
    transition: ProvableStateTransition,
    index = 0
  ) {
    const treeWitness = Circuit.witness(RollupMerkleWitness, () =>
      this.witnessProvider.getWitness(transition.path)
    );
    const membershipValid = MerkleTreeUtils.checkMembership(
      treeWitness,
      state.stateRoot,
      transition.path,
      transition.from.value
    );
    membershipValid
      .or(transition.from.isSome.not())
      .assertTrue(`MerkleWitness not valid for StateTransition (${index})`);

    const newRoot = MerkleTreeUtils.computeRoot(
      treeWitness,
      transition.to.value
    );
    state.stateRoot = Circuit.if(
      transition.to.isSome,
      newRoot,
      state.stateRoot
    );

    state.stateTransitionList.push(transition);
  }

  /**
   * Applies a whole batch of StateTransitions at once
   */
  public runBatch(
    publicInput: StateTransitionProverPublicInput,
    fromStateRoot: Field,
    batch: StateTransitionProvableBatch
  ) {
    publicInput.fromStateRoot.assertEquals(
      fromStateRoot,
      "From state-root not matching"
    );

    const result = this.applyTransitions(
      fromStateRoot,
      publicInput.fromStateTransitionsHash,
      batch
    );

    publicInput.toStateRoot.assertEquals(
      result.stateRoot,
      "Resulting state-root not matching"
    );
    publicInput.toStateTransitionsHash.assertEquals(
      result.stateTransitionList.commitment,
      "Resulting state transition commitment not matching"
    );
  }

  public merge(
    publicInput: StateTransitionProverPublicInput,
    proof1: SelfProof<StateTransitionProverPublicInput>,
    proof2: SelfProof<StateTransitionProverPublicInput>
  ) {
    // Check state
    publicInput.fromStateRoot.assertEquals(
      proof1.publicInput.fromStateRoot,
      "StateRoot step 1"
    );
    proof1.publicInput.toStateRoot.assertEquals(
      proof2.publicInput.fromStateRoot,
      "StateRoot step 2"
    );
    proof2.publicInput.toStateRoot.assertEquals(
      publicInput.toStateRoot,
      "StateRoot step 3"
    );

    // Check ST list
    publicInput.fromStateTransitionsHash.assertEquals(
      proof1.publicInput.fromStateTransitionsHash,
      "ST commitment step 1"
    );
    proof1.publicInput.toStateTransitionsHash.assertEquals(
      proof2.publicInput.fromStateTransitionsHash,
      "ST commitment step 2"
    );
    proof2.publicInput.toStateTransitionsHash.assertEquals(
      publicInput.toStateTransitionsHash,
      "ST commitment step 3"
    );
  }

  public getZkProgram(): ZkProgramType<StateTransitionProverPublicInput> {
    return this.program;
  }

  public getProofType(): Subclass<
    typeof Proof<StateTransitionProverPublicInput>
  > {
    return ((instance: StateTransitionProver) =>
      class StateTransitionProof extends Proof<StateTransitionProverPublicInput> {
        public static publicInputType = StateTransitionProverPublicInput;

        public static tag = () => instance.getZkProgram();
      })(this);
  }
}
