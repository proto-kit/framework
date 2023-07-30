import { Experimental, Field, Provable, SelfProof } from "snarkyjs";
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

import { StateTransitionWitnessProvider } from "./StateTransitionWitnessProvider.js";
import { AreProofsEnabled, PlainZkProgram, provableMethod } from "@yab/common";
import {
  StateTransitionProvable,
  StateTransitionProverPublicInput,
  StateTransitionProof,
  StateTransitionProverPublicOutput,
} from "./StateTransitionProvable";
import { ProtocolModule } from "../../protocol/ProtocolModule";
import { StateTransitionWitnessProviderReference } from "./StateTransitionWitnessProviderReference";

const errors = {
  stateRootNotMatching: (step: string) => `StateRoots not matching ${step}`,

  stateTransitionsHashNotMatching: (step: string) =>
    `State transitions hash not matching ${step}`,

  merkleWitnessNotCorrect: (index: number) =>
    `MerkleWitness not valid for StateTransition (${index})`,

  noWitnessProviderSet: () =>
    new Error(
      "WitnessProvider not set, set it before you use StateTransitionProvider"
    ),

  propertyNotMatching: (propertyName: string) => `${propertyName} not matching`,
};

interface StateTransitionProverExecutionState {
  stateRoot: Field;
  stateTransitionList: ProvableHashList<ProvableStateTransition>;
}

const StateTransitionSelfProofClass = SelfProof<
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput
>;

/**
 * StateTransitionProver is the prover that proves the application of some state
 * transitions and checks and updates their merkle-tree entries
 */
@injectable()
export class StateTransitionProver
  extends ProtocolModule<
    StateTransitionProverPublicInput,
    StateTransitionProverPublicOutput
  >
  implements StateTransitionProvable
{
  public constructor(
    // Injected
    public readonly witnessProviderReference: StateTransitionWitnessProviderReference
  ) {
    super();
  }

  public zkProgramFactory(): PlainZkProgram<
    StateTransitionProverPublicInput,
    StateTransitionProverPublicOutput
  > {
    const instance = this;

    const program = Experimental.ZkProgram({
      publicInput: StateTransitionProverPublicInput,
      publicOutput: StateTransitionProverPublicOutput,

      methods: {
        proveBatch: {
          privateInputs: [StateTransitionProvableBatch],

          method(
            publicInput: StateTransitionProverPublicInput,
            batch: StateTransitionProvableBatch
          ) {
            return instance.runBatch(publicInput, batch);
          },
        },

        merge: {
          privateInputs: [
            StateTransitionSelfProofClass,
            StateTransitionSelfProofClass,
          ],

          method(
            publicInput: StateTransitionProverPublicInput,
            proof1: StateTransitionProof,
            proof2: StateTransitionProof
          ) {
            return instance.merge(publicInput, proof1, proof2);
          },
        },
      },
    });

    const methods = {
      proveBatch: program.proveBatch.bind(program),
      merge: program.merge.bind(program),
    };

    const SelfProofClass = Experimental.ZkProgram.Proof(program);

    return {
      compile: program.compile.bind(program),
      verify: program.verify.bind(program),
      Proof: SelfProofClass,
      methods,
    };
  }

  private get witnessProvider(): StateTransitionWitnessProvider {
    const provider = this.witnessProviderReference.getWitnessProvider();
    if (provider === undefined) {
      throw errors.noWitnessProviderSet();
    }
    return provider;
  }

  /**
   * Applies the state transitions to the current stateRoot
   * and returns the new prover state
   */
  public applyTransitions(
    stateRoot: Field,
    stateTransitionCommitmentFrom: Field,
    transitionBatch: StateTransitionProvableBatch
  ): StateTransitionProverExecutionState {
    const state: StateTransitionProverExecutionState = {
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
    state: StateTransitionProverExecutionState,
    transition: ProvableStateTransition,
    index = 0
  ) {
    const treeWitness = Provable.witness(RollupMerkleWitness, () =>
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
      .assertTrue(errors.merkleWitnessNotCorrect(index));

    const newRoot = MerkleTreeUtils.computeRoot(
      treeWitness,
      transition.to.value
    );
    state.stateRoot = Provable.if(
      transition.to.isSome,
      newRoot,
      state.stateRoot
    );

    state.stateTransitionList.pushIf(
      transition,
      transition.path.equals(Field(0)).not()
    );
  }

  /**
   * Applies a whole batch of StateTransitions at once
   */
  @provableMethod()
  public runBatch(
    publicInput: StateTransitionProverPublicInput,
    batch: StateTransitionProvableBatch
  ): StateTransitionProverPublicOutput {
    Provable.log(publicInput);
    const result = this.applyTransitions(
      publicInput.stateRoot,
      publicInput.stateTransitionsHash,
      batch
    );

    const output = new StateTransitionProverPublicOutput({
      stateRoot: result.stateRoot,
      stateTransitionsHash: result.stateTransitionList.commitment,
    });
    Provable.log(output);
    return output;
  }

  @provableMethod()
  public merge(
    publicInput: StateTransitionProverPublicInput,
    proof1: StateTransitionProof,
    proof2: StateTransitionProof
  ): StateTransitionProverPublicOutput {
    proof1.verify();
    proof2.verify();

    // Check state
    publicInput.stateRoot.assertEquals(
      proof1.publicInput.stateRoot,
      errors.stateRootNotMatching("publicInput.from -> proof1.from")
    );
    proof1.publicOutput.stateRoot.assertEquals(
      proof2.publicInput.stateRoot,
      errors.stateRootNotMatching("proof1.to -> proof2.from")
    );

    // Check ST list
    publicInput.stateTransitionsHash.assertEquals(
      proof1.publicInput.stateTransitionsHash,
      errors.stateTransitionsHashNotMatching("publicInput.from -> proof1.from")
    );
    proof1.publicOutput.stateTransitionsHash.assertEquals(
      proof2.publicInput.stateTransitionsHash,
      errors.stateTransitionsHashNotMatching("proof1.to -> proof2.from")
    );

    return new StateTransitionProverPublicInput({
      stateRoot: proof2.publicOutput.stateRoot,
      stateTransitionsHash: proof2.publicOutput.stateTransitionsHash,
    });
  }
}
