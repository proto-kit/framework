import type { ProvableStateTransition } from "./StateTransition.js";
import { Circuit, Experimental, Field, Proof, SelfProof, Struct } from "snarkyjs";
import { DefaultProvableMerkleList, ProvableHashList } from "@yab/protocol";
import { MerkleTreeUtils, RollupMerkleWitness } from "../utils/RollupMerkleTree.js";
import type { Subclass, ZkProgramType } from "../../Utils.js";
import { inject, injectable } from "tsyringe";
import { StateTransitionWitnessProvider } from "./StateTransitionWitnessProvider.js";
import { StateTransitionProvableBatch } from "./StateTransitionProvableBatch.js";
import { Constants } from "../../Constants.js";

export type StateTransitionProverComputationState = {
    stateTransitions: ProvableHashList<ProvableStateTransition>
    stateRoot: Field
}

export class StateTransitionProverState extends Struct({
    stateTransitionsHash: Field,
    stateRoot: Field
}){}

export class StateTransitionProverPublicInput extends Struct({
    fromStateTransitionsHash: Field,
    toStateTransitionsHash: Field,
    fromStateRoot: Field,
    toStateRoot: Field,
}) {
}

@injectable()
export class StateTransitionProver {

    private readonly program = ((instance: StateTransitionProver) =>
        Experimental.ZkProgram({
            publicInput: StateTransitionProverState,
            publicOutput: StateTransitionProverState,

            methods: {
                proveBatch: {
                    privateInputs: [Field, StateTransitionProvableBatch],

                    method(
                        publicInput: StateTransitionProverState,
                        fromStateRoot: Field,
                        batch: StateTransitionProvableBatch
                    ) : StateTransitionProverState {
                        return instance.runBatch(publicInput, fromStateRoot, batch);
                    },
                },

                merge: {
                    privateInputs: [SelfProof<StateTransitionProverState, StateTransitionProverState>, SelfProof<StateTransitionProverState, StateTransitionProverState>],

                    method(
                        publicInput: StateTransitionProverState,
                        proof1: SelfProof<StateTransitionProverState, StateTransitionProverState>,
                        proof2: SelfProof<StateTransitionProverState, StateTransitionProverState>
                    ) : StateTransitionProverState {
                        return instance.merge(publicInput, proof1, proof2);
                    },
                },
            },
        })
    )(this);

    public constructor(
      @inject("StateTransitionWitnessProvider") private readonly witnessProvider: StateTransitionWitnessProvider
    ) {
    }

    public applyTransitions(
        stateRoot: Field,
        stateTransitionCommitmentFrom: Field,
        transitionBatch: StateTransitionProvableBatch
    ): StateTransitionProverComputationState {
        const state: StateTransitionProverComputationState = {
            stateRoot,
            stateTransitions: new DefaultProvableMerkleList(stateTransitionCommitmentFrom),
        };
        const transitions = transitionBatch.batch;

        for (let index = 0; index < Constants.STATE_TRANSITION_PROVER_BATCH_SIZE; index++) {
            this.applyTransition(state, transitions[index], index);
        }

        return state;
    }

    public applyTransition(state: StateTransitionProverComputationState, transition: ProvableStateTransition, index = 0) {
        const treeWitness = Circuit.witness(RollupMerkleWitness, () => this.witnessProvider.getWitness(transition.path));

        const membershipValid = MerkleTreeUtils.checkMembership(treeWitness, state.stateRoot, transition.path, transition.from.value);
        membershipValid.or(transition.from.isSome.not()).assertTrue(`MerkleWitness not valid for StateTransition (${index})`);

        const newRoot = MerkleTreeUtils.computeRoot(treeWitness, transition.to.value);
        state.stateRoot = Circuit.if(transition.to.isSome, newRoot, state.stateRoot);

        state.stateTransitions.push(transition);
    }

    public runBatch(publicInput: StateTransitionProverState, fromStateRoot: Field, batch: StateTransitionProvableBatch) : StateTransitionProverState {

        publicInput.stateRoot.assertEquals(fromStateRoot, "From state-root not matching");

        const computationState = this.applyTransitions(fromStateRoot, publicInput.stateTransitionsHash, batch)
        return new StateTransitionProverState({
            stateRoot: computationState.stateRoot,
            stateTransitionsHash: computationState.stateTransitions.commitment
        })
    }

    public merge(
        publicInput: StateTransitionProverState,
        proof1: SelfProof<StateTransitionProverState, StateTransitionProverState>,
        proof2: SelfProof<StateTransitionProverState, StateTransitionProverState>
    ) : StateTransitionProverState {

        // Check state
        publicInput.stateRoot.assertEquals(proof1.publicInput.stateRoot, "StateRoot step 1");
        proof1.publicOutput.stateRoot.assertEquals(proof2.publicInput.stateRoot, "StateRoot step 2");
        const resultingStateRoot = proof2.publicOutput.stateRoot;

        // Check ST list
        publicInput.stateTransitionsHash.assertEquals(proof1.publicInput.stateTransitionsHash, "ST commitment step 1");
        proof1.publicOutput.stateTransitionsHash.assertEquals(proof2.publicInput.stateTransitionsHash, "ST commitment step 2");
        const resultingStateTransitionsHash = proof2.publicOutput.stateTransitionsHash

        return new StateTransitionProverState({
            stateRoot: resultingStateRoot,
            stateTransitionsHash: resultingStateTransitionsHash
        })
    }

    public getZkProgram(): ZkProgramType<StateTransitionProverState, StateTransitionProverState> {
        return this.program;
    }

    public getProofType(): Subclass<typeof Proof<StateTransitionProverState, StateTransitionProverState>> {

        return ((instance: StateTransitionProver) =>
            class StateTransitionProof extends Proof<StateTransitionProverState, StateTransitionProverState> {
                public static publicInputType = StateTransitionProverState;
                public static publicOutput = StateTransitionProverState;

                public static tag = () => instance.getZkProgram();
            }
        )(this)
    }
}
