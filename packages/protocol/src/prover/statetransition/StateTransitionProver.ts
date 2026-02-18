import {
  AreProofsEnabled,
  PlainZkProgram,
  provableMethod,
  ZkProgrammable,
  CompilableModule,
  type ArtifactRecord,
  type CompileRegistry,
  TreeWrite,
  LinkedMerkleTreeCircuitOps,
  LinkedMerkleTreeWitness,
} from "@proto-kit/common";
import { Field, Provable, SelfProof, ZkProgram } from "o1js";
import { injectable } from "tsyringe";

import { Constants } from "../../Constants";
import { ProvableStateTransition } from "../../model/StateTransition";
import {
  MerkleWitnessBatch,
  StateTransitionProvableBatch,
  StateTransitionType,
} from "../../model/StateTransitionProvableBatch";
import { ProtocolModule } from "../../protocol/ProtocolModule";
import { DefaultProvableHashList } from "../../utils/ProvableHashList";
import { WitnessedRootHashList } from "../accumulators/WitnessedRootHashList";
import { AppliedBatchHashList } from "../accumulators/AppliedBatchHashList";
import { AppliedStateTransitionBatchState } from "../../model/AppliedStateTransitionBatch";

import {
  StateTransitionProof,
  StateTransitionProvable,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "./StateTransitionProvable";

const errors = {
  propertyNotMatching: (property: string, step: string) =>
    `${property} not matching ${step}`,

  merkleWitnessNotCorrect: (index: number) =>
    `MerkleWitness not valid for StateTransition (${index})`,
};

interface StateTransitionProverExecutionState {
  currentBatch: AppliedStateTransitionBatchState;
  batchList: AppliedBatchHashList;
  finalizedRoot: Field;
  witnessedRoots: WitnessedRootHashList;
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
    private readonly stateTransitionProver: Pick<
      StateTransitionProver,
      "areProofsEnabled"
    >
  ) {
    super();
  }

  public get areProofsEnabled(): AreProofsEnabled | undefined {
    return this.stateTransitionProver.areProofsEnabled;
  }

  public zkProgramFactory(): PlainZkProgram<
    StateTransitionProverPublicInput,
    StateTransitionProverPublicOutput
  >[] {
    const instance = this;

    const program = ZkProgram({
      name: "StateTransitionProver",
      publicInput: StateTransitionProverPublicInput,
      publicOutput: StateTransitionProverPublicOutput,

      methods: {
        proveBatch: {
          privateInputs: [
            StateTransitionProvableBatch,
            MerkleWitnessBatch,
            AppliedStateTransitionBatchState,
          ],

          async method(
            publicInput: StateTransitionProverPublicInput,
            batch: StateTransitionProvableBatch,
            witnesses: MerkleWitnessBatch,
            currentAppliedBatch: AppliedStateTransitionBatchState
          ) {
            return {
              publicOutput: await instance.proveBatch(
                publicInput,
                batch,
                witnesses,
                currentAppliedBatch
              ),
            };
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
            return {
              publicOutput: await instance.merge(publicInput, proof1, proof2),
            };
          },
        },
      },
    });

    const methods = {
      proveBatch: program.proveBatch.bind(program),
      merge: program.merge.bind(program),
    };

    const SelfProofClass = ZkProgram.Proof(program);

    return [
      {
        name: program.name,
        compile: program.compile.bind(program),
        verify: program.verify.bind(program),
        analyzeMethods: program.analyzeMethods.bind(program),
        Proof: SelfProofClass,
        methods,
      },
    ];
  }

  private transitionToTreeWrite(
    st: ProvableStateTransition,
    witness: LinkedMerkleTreeWitness
  ): TreeWrite {
    // If from isSome isn't set, the user "ignored the previous value", i.e. we
    // can assume the value in the witness is correct
    const from = Provable.if(
      st.from.isSome,
      st.from.value,
      witness.leafCurrent.leaf.value
    );

    // If the user doesn't want to write, we just carry over the from-value
    const to = Provable.if(st.to.isSome, st.to.value, from);
    return {
      path: st.path,
      from,
      to,
    };
  }

  /**
   * Applies the state transitions to the current stateRoot
   * and returns the new prover state
   */
  public applyTransitions(
    state: StateTransitionProverExecutionState,
    batch: StateTransitionProvableBatch,
    witnesses: MerkleWitnessBatch
  ) {
    const transitions = batch.batch;

    const batchSize = Constants.getConstant(
      "STATE_TRANSITION_BATCH_SIZE",
      parseInt
    );
    for (let index = 0; index < batchSize; index++) {
      const updatedBatchState = this.applyTransition(
        state.currentBatch,
        transitions[index].stateTransition,
        witnesses.witnesses[index],
        index
      );

      // If the current batch is finished, we push it to the list
      // and initialize the next
      const { type, witnessRoot } = transitions[index];
      const closing = type.isClosing();
      const closingAndApply = type.type.equals(
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

      // Add computed root to the witnessed root list if needed
      witnessRoot
        .implies(closing)
        .assertTrue("Can only witness roots at closing batches");
      state.witnessedRoots.pushIf(
        {
          root: state.finalizedRoot,
          appliedBatchListState: state.batchList.commitment,
        },
        witnessRoot
      );

      const isDummy = ProvableStateTransition.isDummy(
        transitions[index].stateTransition
      );

      // Dummy STs cannot change any state, as to prevent any
      // dummy-in-the-middle attacks. This is given if the type is nothing.
      isDummy
        .implies(type.isNothing())
        .assertTrue("Dummies have to be of type 'nothing'");

      isDummy
        .implies(state.currentBatch.batchHash.equals(0))
        .assertTrue("Dummies can only be placed on closed batchLists");

      // Dummies don't close the batch, but we still want to ignore any
      // updated batch, since we need to result to stay.
      // This will break the pipeline if there is a dummy in the middle,
      // but will only end up to invalid proofs (i.e. mismatched batches)

      state.currentBatch = new AppliedStateTransitionBatchState(
        Provable.if(
          closing.or(isDummy),
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
    witness: LinkedMerkleTreeWitness,
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
    return new AppliedStateTransitionBatchState({
      batchHash: stList.commitment,
      root: impliedRoot,
    });
  }

  private applyTransitionToRoot(
    transition: ProvableStateTransition,
    root: Field,
    merkleWitness: LinkedMerkleTreeWitness,
    index: number
  ): Field {
    const treeWrite = this.transitionToTreeWrite(transition, merkleWitness);

    return LinkedMerkleTreeCircuitOps.applyTreeWrite(
      root,
      merkleWitness,
      treeWrite,
      index
    );
  }

  /**
   * Applies a whole batch of StateTransitions at once
   */
  @provableMethod()
  public async proveBatch(
    publicInput: StateTransitionProverPublicInput,
    batch: StateTransitionProvableBatch,
    witnesses: MerkleWitnessBatch,
    currentAppliedBatch: AppliedStateTransitionBatchState
  ): Promise<StateTransitionProverPublicOutput> {
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
      batchList: new AppliedBatchHashList(publicInput.batchesHash),
      currentBatch: currentAppliedBatch,
      finalizedRoot: publicInput.root,
      witnessedRoots: new WitnessedRootHashList(publicInput.witnessedRootsHash),
    };

    const result = this.applyTransitions(state, batch, witnesses);

    return new StateTransitionProverPublicOutput({
      batchesHash: result.batchList.commitment,
      currentBatchStateHash: result.currentBatch.hashOrZero(),
      root: result.finalizedRoot,
      witnessedRootsHash: result.witnessedRoots.commitment,
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

    // Check root accumulator
    publicInput.witnessedRootsHash.assertEquals(
      proof1.publicInput.witnessedRootsHash,
      errors.propertyNotMatching(
        "witnessedRootsHash",
        "publicInput.from -> proof1.from"
      )
    );
    proof1.publicOutput.witnessedRootsHash.assertEquals(
      proof2.publicInput.witnessedRootsHash,
      errors.propertyNotMatching(
        "witnessedRootsHash",
        "proof1.to -> proof2.from"
      )
    );

    return new StateTransitionProverPublicInput({
      currentBatchStateHash: proof2.publicOutput.currentBatchStateHash,
      batchesHash: proof2.publicOutput.batchesHash,
      root: proof2.publicOutput.root,
      witnessedRootsHash: proof2.publicOutput.witnessedRootsHash,
    });
  }
}

@injectable()
export class StateTransitionProver
  extends ProtocolModule
  implements StateTransitionProvable, CompilableModule
{
  public zkProgrammable: StateTransitionProverProgrammable;

  public constructor() {
    super();
    this.zkProgrammable = new StateTransitionProverProgrammable(this);
  }

  public async compile(
    registry: CompileRegistry
  ): Promise<void | ArtifactRecord> {
    return await registry.proverNeeded(
      async () => await this.zkProgrammable.compile(registry)
    );
  }

  public proveBatch(
    publicInput: StateTransitionProverPublicInput,
    batch: StateTransitionProvableBatch,
    witnesses: MerkleWitnessBatch,
    startingAppliedBatch: AppliedStateTransitionBatchState
  ): Promise<StateTransitionProverPublicOutput> {
    return this.zkProgrammable.proveBatch(
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
  ): Promise<StateTransitionProverPublicOutput> {
    return this.zkProgrammable.merge(publicInput, proof1, proof2);
  }
}
