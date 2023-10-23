/* eslint-disable max-lines */
import { Bool, Experimental, Field, Provable, SelfProof } from "snarkyjs";
import { injectable } from "tsyringe";
import {
  AreProofsEnabled,
  log,
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
  propertyNotMatching: (property: string, step: string) =>
    `${property} not matching ${step}`,

  merkleWitnessNotCorrect: (index: number, type: string) =>
    `MerkleWitness not valid for StateTransition (${index}, type ${type})`,

  noWitnessProviderSet: () =>
    new Error(
      "WitnessProvider not set, set it before you use StateTransitionProvider"
    ),
};

interface StateTransitionProverExecutionState {
  stateRoot: Field;
  protocolStateRoot: Field;
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
    protocolStateRoot: Field,
    stateTransitionCommitmentFrom: Field,
    protocolTransitionCommitmentFrom: Field,
    transitionBatch: StateTransitionProvableBatch
  ): StateTransitionProverExecutionState {
    const state: StateTransitionProverExecutionState = {
      stateRoot,
      protocolStateRoot,

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
      .assertTrue(
        errors.merkleWitnessNotCorrect(
          index,
          type.isNormal().toBoolean() ? "normal" : "protocol"
        )
      );

    const newRoot = MerkleTreeUtils.computeRoot(
      treeWitness,
      transition.to.value
    );

    state.stateRoot = Provable.if(
      transition.to.isSome,
      newRoot,
      state.stateRoot
    );

    // Only update protocol state root if ST is also of type protocol
    // Since protocol STs are all at the start of the batch, this works
    state.protocolStateRoot = Provable.if(
      transition.to.isSome.and(type.isProtocol()),
      newRoot,
      state.protocolStateRoot
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
      publicInput.protocolStateRoot,
      publicInput.stateTransitionsHash,
      publicInput.protocolTransitionsHash,
      batch
    );

    return new StateTransitionProverPublicOutput({
      stateRoot: result.stateRoot,
      stateTransitionsHash: result.stateTransitionList.commitment,
      protocolTransitionsHash: result.protocolTransitionList.commitment,
      protocolStateRoot: result.protocolStateRoot,
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
      errors.propertyNotMatching("stateRoot", "publicInput.from -> proof1.from")
    );
    proof1.publicOutput.stateRoot.assertEquals(
      proof2.publicInput.stateRoot,
      errors.propertyNotMatching("stateRoot", "proof1.to -> proof2.from")
    );

    // Check ST list
    publicInput.stateTransitionsHash.assertEquals(
      proof1.publicInput.stateTransitionsHash,
      errors.propertyNotMatching(
        "stateTransitionsHash",
        "publicInput.from -> proof1.from"
      )
    );
    proof1.publicOutput.stateTransitionsHash.assertEquals(
      proof2.publicInput.stateTransitionsHash,
      errors.propertyNotMatching(
        "stateTransitionsHash",
        "proof1.to -> proof2.from"
      )
    );

    // Check Protocol ST list
    publicInput.protocolTransitionsHash.assertEquals(
      proof1.publicInput.protocolTransitionsHash,
      errors.propertyNotMatching(
        "protocolTransitionsHash",
        "publicInput.from -> proof1.from"
      )
    );
    proof1.publicOutput.protocolTransitionsHash.assertEquals(
      proof2.publicInput.protocolTransitionsHash,
      errors.propertyNotMatching(
        "protocolTransitionsHash",
        "proof1.to -> proof2.from"
      )
    );

    // Check protocol state root
    publicInput.protocolStateRoot.assertEquals(
      proof1.publicInput.protocolStateRoot,
      errors.propertyNotMatching(
        "protocolStateRoot",
        "publicInput.from -> proof1.from"
      )
    );
    proof1.publicOutput.protocolStateRoot.assertEquals(
      proof2.publicInput.protocolStateRoot,
      errors.propertyNotMatching(
        "protocolStateRoot",
        "proof1.to -> proof2.from"
      )
    );

    return new StateTransitionProverPublicInput({
      stateRoot: proof2.publicOutput.stateRoot,
      stateTransitionsHash: proof2.publicOutput.stateTransitionsHash,
      protocolTransitionsHash: proof2.publicOutput.protocolTransitionsHash,
      protocolStateRoot: proof2.publicOutput.protocolStateRoot,
    });
  }
}

@injectable()
export class StateTransitionProver
  extends ProtocolModule<object>
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
