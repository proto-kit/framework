/* eslint-disable max-lines */
import { Bool, Experimental, Field, Provable, SelfProof } from "o1js";
import { injectable } from "tsyringe";
import {
  AreProofsEnabled,
  log,
  PlainZkProgram,
  provableMethod,
  RollupMerkleTreeWitness,
  ZkProgrammable,
} from "@proto-kit/common";

import {
  DefaultProvableHashList,
  ProvableHashList,
} from "../../utils/ProvableHashList";
import { ProvableStateTransition } from "../../model/StateTransition";
import {
  AppliedStateTransitionBatch,
  AppliedStateTransitionBatchState,
  MerkleWitnessBatch,
  ProvableStateTransitionType,
  StateTransitionProvableBatch,
  StateTransitionType,
} from "../../model/StateTransitionProvableBatch";
import { constants } from "../../Constants";
import { ProtocolModule } from "../../protocol/ProtocolModule";
import { NonMethods } from "../../utils/utils";

import { StateTransitionWitnessProvider } from "./StateTransitionWitnessProvider";
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

  merkleWitnessNotCorrect: (index: number) =>
    `MerkleWitness not valid for StateTransition (${index})`,
};

interface StateTransitionProverExecutionState {
  currentBatch: AppliedStateTransitionBatchState;
  batchList: ProvableHashList<NonMethods<AppliedStateTransitionBatch>>;
  finalizedRoot: Field;
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
    private readonly stateTransitionProver: StateTransitionProver
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
          privateInputs: [
            StateTransitionProvableBatch,
            MerkleWitnessBatch,
            AppliedStateTransitionBatchState,
          ],

          method(
            publicInput: StateTransitionProverPublicInput,
            batch: StateTransitionProvableBatch,
            witnesses: MerkleWitnessBatch,
            currentAppliedBatch: AppliedStateTransitionBatchState
          ) {
            return instance.runBatch(
              publicInput,
              batch,
              witnesses,
              currentAppliedBatch
            );
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

  public applyTransitions(
    state: StateTransitionProverExecutionState,
    batch: StateTransitionProvableBatch,
    witnesses: MerkleWitnessBatch
  ) {
    const transitions = batch.batch;
    const types = batch.types;

    for (
      let index = 0;
      index < constants.stateTransitionProverBatchSize;
      index++
    ) {
      const updatedBatchState = this.applyTransition(
        state.currentBatch,
        transitions[index],
        witnesses.witnesses[index],
        types[index],
        index
      );

      // If the current batch is finished, we push it to the list
      // and initialize the next
      const closing = types[index].isClosing();
      const closingAndApply = types[index].type.equals(
        StateTransitionType.closeAndApply
      );

      // Create the newBatch
      // The root is based on if the previous batch will be applied or not
      const base = Provable.if(
        closingAndApply,
        updatedBatchState.root,
        state.finalizedRoot
      );
      const newBatchState = new AppliedStateTransitionBatchState({
        batchHash: Field(0),
        root: base,
      });

      const updatedBatch = {
        applied: closingAndApply,
        batchHash: updatedBatchState.batchHash,
      };
      state.batchList.pushIf(updatedBatch, closing);
      state.finalizedRoot = Provable.if(
        closingAndApply,
        updatedBatchState.root,
        state.finalizedRoot
      );

      state.currentBatch = new AppliedStateTransitionBatchState(
        Provable.if(
          closing,
          AppliedStateTransitionBatchState,
          newBatchState,
          updatedBatchState
        )
      );
    }

    return state;
  }

  /**
   * Applies a single state transition to the given state
   * and mutates it in place
   */
  public applyTransition(
    currentBatch: AppliedStateTransitionBatchState,
    transition: ProvableStateTransition,
    witness: RollupMerkleTreeWitness,
    type: ProvableStateTransitionType,
    index = 0
  ) {
    const impliedRoot = this.applyTransitionToRoot(
      transition,
      currentBatch.root,
      witness,
      index
    );

    // Append ST to the current batch's ST-list
    const stList = new DefaultProvableHashList(
      ProvableStateTransition,
      currentBatch.batchHash
    );
    stList.push(transition);

    // Update batch
    const additiveBatch = new AppliedStateTransitionBatchState({
      batchHash: stList.commitment,
      root: impliedRoot,
    });

    return additiveBatch;
  }

  private applyTransitionToRoot(
    transition: ProvableStateTransition,
    root: Field,
    witness: RollupMerkleTreeWitness,
    index: number
  ): Field {
    const membershipValid = witness.checkMembership(
      root,
      transition.path,
      transition.from.value
    );

    membershipValid
      .or(transition.from.isSome.not())
      .assertTrue(errors.merkleWitnessNotCorrect(index));

    const newRoot = witness.calculateRoot(transition.to.value);

    return Provable.if(transition.to.isSome, newRoot, root);
  }

  /**
   * Applies a whole batch of StateTransitions at once
   */
  @provableMethod()
  public runBatch(
    publicInput: StateTransitionProverPublicInput,
    batch: StateTransitionProvableBatch,
    witnesses: MerkleWitnessBatch,
    currentAppliedBatch: AppliedStateTransitionBatchState
  ) {
    currentAppliedBatch
      .hashOrZero()
      .assertEquals(
        publicInput.currentBatchStateHash,
        "Provided startingAppliedBatch not matching PI hash"
      );

    // Assert that either the currentAppliedBatch is somewhere intermediary
    // or the root is the current "finalized" root
    currentAppliedBatch.root
      .equals(publicInput.root)
      .or(publicInput.currentBatchStateHash.equals(0).not())
      .assertTrue();

    const state: StateTransitionProverExecutionState = {
      batchList: new DefaultProvableHashList(
        AppliedStateTransitionBatch,
        publicInput.batchesHash
      ),
      currentBatch: currentAppliedBatch,
      finalizedRoot: publicInput.root,
    };

    const result = this.applyTransitions(state, batch, witnesses);

    return new StateTransitionProverPublicOutput({
      batchesHash: result.batchList.commitment,
      currentBatchStateHash: result.currentBatch.hashOrZero(),
      root: result.finalizedRoot,
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

    // Check current batch hash
    publicInput.currentBatchStateHash.assertEquals(
      proof1.publicInput.currentBatchStateHash,
      errors.propertyNotMatching(
        "currentBatchStateHash",
        "publicInput.from -> proof1.from"
      )
    );
    proof1.publicOutput.currentBatchStateHash.assertEquals(
      proof2.publicInput.currentBatchStateHash,
      errors.propertyNotMatching(
        "currentBatchStateHash",
        "proof1.to -> proof2.from"
      )
    );

    // Check batches hash
    publicInput.batchesHash.assertEquals(
      proof1.publicInput.batchesHash,
      errors.propertyNotMatching(
        "batchesHash",
        "publicInput.from -> proof1.from"
      )
    );
    proof1.publicOutput.batchesHash.assertEquals(
      proof2.publicInput.batchesHash,
      errors.propertyNotMatching("batchesHash", "proof1.to -> proof2.from")
    );

    // Check root
    publicInput.root.assertEquals(
      proof1.publicInput.root,
      errors.propertyNotMatching("root", "publicInput.from -> proof1.from")
    );
    proof1.publicOutput.root.assertEquals(
      proof2.publicInput.root,
      errors.propertyNotMatching("root", "proof1.to -> proof2.from")
    );

    return new StateTransitionProverPublicInput({
      currentBatchStateHash: proof2.publicOutput.currentBatchStateHash,
      batchesHash: proof2.publicOutput.batchesHash,
      root: proof2.publicOutput.root,
    });
  }
}

@injectable()
export class StateTransitionProver
  extends ProtocolModule
  implements StateTransitionProvable
{
  public readonly zkProgrammable: StateTransitionProverProgrammable;

  public constructor() {
    super();
    this.zkProgrammable = new StateTransitionProverProgrammable(this);
  }

  public runBatch(
    publicInput: StateTransitionProverPublicInput,
    batch: StateTransitionProvableBatch,
    witnesses: MerkleWitnessBatch,
    startingAppliedBatch: AppliedStateTransitionBatchState
  ): StateTransitionProverPublicOutput {
    return this.zkProgrammable.runBatch(
      publicInput,
      batch,
      witnesses,
      startingAppliedBatch
    );
  }

  public merge(
    publicInput: StateTransitionProverPublicInput,
    proof1: StateTransitionProof,
    proof2: StateTransitionProof
  ): StateTransitionProverPublicOutput {
    return this.zkProgrammable.merge(publicInput, proof1, proof2);
  }
}
