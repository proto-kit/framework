/* eslint-disable max-lines */
import { Experimental, Field, Provable, SelfProof } from "snarkyjs";
import { injectable } from "tsyringe";
import {
  AreProofsEnabled,
  PlainZkProgram,
  provableMethod,
  ZkProgrammable,
} from "@proto-kit/common";

import {
  MerkleTreeUtils,
  RollupMerkleWitness,
} from "../../utils/merkletree/RollupMerkleTree.js";
import {
  DefaultProvableHashList,
  ProvableHashList,
} from "../../utils/ProvableHashList";
import { ProvableStateTransition } from "../../model/StateTransition";
import {
  ProvableStateTransitionType,
  StateTransitionProvableBatch,
} from "../../model/StateTransitionProvableBatch";
import { constants } from "../../Constants";
import { ProtocolModule } from "../../protocol/ProtocolModule";

import { StateTransitionWitnessProvider } from "./StateTransitionWitnessProvider.js";
import {
  StateTransitionProvable,
  StateTransitionProverPublicInput,
  StateTransitionProof,
  StateTransitionProverPublicOutput,
} from "./StateTransitionProvable";
import { StateTransitionWitnessProviderReference } from "./StateTransitionWitnessProviderReference";

const errors = {
  stateRootNotMatching: (step: string) => `StateRoots not matching ${step}`,

  stateTransitionsHashNotMatching: (step: string) =>
    `State transitions hash not matching ${step}`,

  protocolTransitionsHashNotMatching: (step: string) =>
    `Protocol transitions hash not matching ${step}`,

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
  protocolTransitionList: ProvableHashList<ProvableStateTransition>;
}

const StateTransitionSelfProofClass = SelfProof<
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput
>;

/**
 * StateTransitionProver is the prover that proves the application of some state
 * transitions and checks and updates their merkle-tree entries
 */
export class StateTransitionProverProgrammable extends ZkProgrammable<
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput
> {
  public constructor(
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    private readonly stateTransitionProver: StateTransitionProver,
    public readonly witnessProviderReference: StateTransitionWitnessProviderReference
  ) {
    super();
  }

  public get appChain(): AreProofsEnabled | undefined {
    return this.stateTransitionProver.appChain;
  }

  public zkProgramFactory(): PlainZkProgram<
    StateTransitionProverPublicInput,
    StateTransitionProverPublicOutput
  > {
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-this-alias,consistent-this,unicorn/no-this-assignment
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
    protocolTransitionCommitmentFrom: Field,
    transitionBatch: StateTransitionProvableBatch
  ): StateTransitionProverExecutionState {
    const state: StateTransitionProverExecutionState = {
      stateRoot,

      stateTransitionList: new DefaultProvableHashList(
        ProvableStateTransition,
        stateTransitionCommitmentFrom
      ),

      protocolTransitionList: new DefaultProvableHashList(
        ProvableStateTransition,
        protocolTransitionCommitmentFrom
      ),
    };

    const transitions = transitionBatch.batch;
    const types = transitionBatch.transitionTypes;
    for (
      let index = 0;
      index < constants.stateTransitionProverBatchSize;
      index++
    ) {
      this.applyTransition(state, transitions[index], types[index], index);
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
    type: ProvableStateTransitionType,
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

    const t = Date.now();
    const newRoot = MerkleTreeUtils.computeRoot(
      treeWitness,
      transition.to.value
    );
    Provable.log("Compute root took", Date.now() - t, "ms");

    state.stateRoot = Provable.if(
      transition.to.isSome,
      newRoot,
      state.stateRoot
    );

    const isNotDummy = transition.path.equals(Field(0)).not();

    state.stateTransitionList.pushIf(
      transition,
      isNotDummy.and(type.isNormal())
    );
    state.protocolTransitionList.pushIf(
      transition,
      isNotDummy.and(type.isProtocol())
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
    const result = this.applyTransitions(
      publicInput.stateRoot,
      publicInput.stateTransitionsHash,
      publicInput.protocolTransitionsHash,
      batch
    );

    return new StateTransitionProverPublicOutput({
      stateRoot: result.stateRoot,
      stateTransitionsHash: result.stateTransitionList.commitment,
      protocolTransitionsHash: result.protocolTransitionList.commitment,
    });
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

    // Check Protocol ST list
    publicInput.protocolTransitionsHash.assertEquals(
      proof1.publicInput.protocolTransitionsHash,
      errors.protocolTransitionsHashNotMatching(
        "publicInput.from -> proof1.from"
      )
    );
    proof1.publicOutput.protocolTransitionsHash.assertEquals(
      proof2.publicInput.protocolTransitionsHash,
      errors.protocolTransitionsHashNotMatching("proof1.to -> proof2.from")
    );

    return new StateTransitionProverPublicInput({
      stateRoot: proof2.publicOutput.stateRoot,
      stateTransitionsHash: proof2.publicOutput.stateTransitionsHash,
      protocolTransitionsHash: proof2.publicOutput.protocolTransitionsHash,
    });
  }
}

@injectable()
export class StateTransitionProver
  extends ProtocolModule
  implements StateTransitionProvable
{
  public readonly zkProgrammable: StateTransitionProverProgrammable;

  public constructor(
    // Injected
    public readonly witnessProviderReference: StateTransitionWitnessProviderReference
  ) {
    super();
    this.zkProgrammable = new StateTransitionProverProgrammable(
      this,
      witnessProviderReference
    );
  }

  public runBatch(
    publicInput: StateTransitionProverPublicInput,
    batch: StateTransitionProvableBatch
  ): StateTransitionProverPublicOutput {
    return this.zkProgrammable.runBatch(publicInput, batch);
  }

  public merge(
    publicInput: StateTransitionProverPublicInput,
    proof1: StateTransitionProof,
    proof2: StateTransitionProof
  ): StateTransitionProverPublicOutput {
    return this.zkProgrammable.merge(publicInput, proof1, proof2);
  }
}
