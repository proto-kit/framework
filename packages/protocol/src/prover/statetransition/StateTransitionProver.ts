import {
  AreProofsEnabled,
  PlainZkProgram,
  provableMethod,
  RollupMerkleTreeWitness,
  ZkProgrammable,
} from "@proto-kit/common";
import { Field, Provable, SelfProof, ZkProgram } from "o1js";
import { injectable } from "tsyringe";

import { constants } from "../../Constants";
import { ProvableStateTransition } from "../../model/StateTransition";
import {
  ProvableStateTransitionType,
  StateTransitionProvableBatch,
} from "../../model/StateTransitionProvableBatch";
import { StateTransitionProverType } from "../../protocol/Protocol";
import { ProtocolModule } from "../../protocol/ProtocolModule";
import {
  DefaultProvableHashList,
  ProvableHashList,
} from "../../utils/ProvableHashList";

import {
  StateTransitionProof,
  StateTransitionProvable,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "./StateTransitionProvable";
import { StateTransitionWitnessProvider } from "./StateTransitionWitnessProvider";
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
    const instance = this;

    const program = ZkProgram({
      name: "StateTransitionProver",
      publicInput: StateTransitionProverPublicInput,
      publicOutput: StateTransitionProverPublicOutput,

      methods: {
        proveBatch: {
          privateInputs: [StateTransitionProvableBatch],

          async method(
            publicInput: StateTransitionProverPublicInput,
            batch: StateTransitionProvableBatch
          ) {
            return await instance.runBatch(publicInput, batch);
          },
        },

        merge: {
          privateInputs: [
            StateTransitionSelfProofClass,
            StateTransitionSelfProofClass,
          ],

          async method(
            publicInput: StateTransitionProverPublicInput,
            proof1: StateTransitionProof,
            proof2: StateTransitionProof
          ) {
            return await instance.merge(publicInput, proof1, proof2);
          },
        },
      },
    });

    const methods = {
      proveBatch: program.proveBatch.bind(program),
      merge: program.merge.bind(program),
    };

    const SelfProofClass = ZkProgram.Proof(program);

    return {
      compile: program.compile.bind(program),
      verify: program.verify.bind(program),
      analyzeMethods: program.analyzeMethods.bind(program),
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
    const witness = Provable.witness(RollupMerkleTreeWitness, () =>
      this.witnessProvider.getWitness(transition.path)
    );

    const membershipValid = witness.checkMembership(
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

    const newRoot = witness.calculateRoot(transition.to.value);

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
  public async runBatch(
    publicInput: StateTransitionProverPublicInput,
    batch: StateTransitionProvableBatch
  ): Promise<StateTransitionProverPublicOutput> {
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
  public async merge(
    publicInput: StateTransitionProverPublicInput,
    proof1: StateTransitionProof,
    proof2: StateTransitionProof
  ): Promise<StateTransitionProverPublicOutput> {
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
  extends ProtocolModule
  implements StateTransitionProvable, StateTransitionProverType
{
  public zkProgrammable: StateTransitionProverProgrammable;

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
  ): Promise<StateTransitionProverPublicOutput> {
    return this.zkProgrammable.runBatch(publicInput, batch);
  }

  public merge(
    publicInput: StateTransitionProverPublicInput,
    proof1: StateTransitionProof,
    proof2: StateTransitionProof
  ): Promise<StateTransitionProverPublicOutput> {
    return this.zkProgrammable.merge(publicInput, proof1, proof2);
  }
}
