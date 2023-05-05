import {ProvableStateTransition} from "./StateTransition.js";
import {Circuit, Experimental, Field, SelfProof, Struct} from "snarkyjs";
import {DefaultProvableMerkleList, ProvableMerkleList} from "../utils/ProvableMerkleList.js";
import {MerkleTreeUtils, RollupMerkleWitness} from "../utils/RollupMerkleTree.js";
import {ReturnType, Struct2} from "../../Utils.js";
import { Constants } from "../../Constants.js";
import {inject, injectable} from "tsyringe";

type StateTransitionProverState = { stateRoot: Field, stateTransitionList: ProvableMerkleList }

export interface StateTransitionWitnessProvider {

    getWitness(key: Field) : RollupMerkleWitness

}

export class ProvableStateTransitionBatch extends Struct2({
    batch: Circuit.array(ProvableStateTransition, Constants.STATE_TRANSITION_PROVER_BATCH_SIZE)
})
{

    static fromTransitions(transitions: ProvableStateTransition[]) : ProvableStateTransitionBatch {
        let arr = transitions.slice()
        while(arr.length < Constants.STATE_TRANSITION_PROVER_BATCH_SIZE){
            arr.push(ProvableStateTransition.dummy())
        }
        return new ProvableStateTransitionBatch({ batch: arr })
    }
}

type StateTransitionProgram = ReturnType<typeof Experimental.ZkProgram>
//     & {
//     proveBatch(publicInput: StateTransitionProverPublicInput,
//                stateFrom: Field,
//                batch: ProvableStateTransitionBatch) : Promise<Proof<StateTransitionProverPublicInput>>
// }

@injectable()
export class StateTransitionProver {

    witnessProvider: StateTransitionWitnessProvider
    constructor(@inject("StateTransitionWitnessProvider") witnessProvider: StateTransitionWitnessProvider) {
        this.witnessProvider = witnessProvider
    }

    applyTransitions(
        stateFrom: Field,
        stateTransitionCommitmentFrom: Field,
        transitionBatch: ProvableStateTransitionBatch
    ) : StateTransitionProverState {

        let state: StateTransitionProverState = {
            stateRoot: stateFrom,
            stateTransitionList: new DefaultProvableMerkleList(stateTransitionCommitmentFrom)
        }
        let transitions = transitionBatch.batch

        for(let i = 0 ; i < Constants.STATE_TRANSITION_PROVER_BATCH_SIZE ; i++){

            this.applyTransition(state, transitions[i], i)

        }

        return state

    }

    applyTransition(state: StateTransitionProverState, transition: ProvableStateTransition, i: number = 0) {

        let treeWitness = Circuit.witness(RollupMerkleWitness, () => {
            return this.witnessProvider.getWitness(transition.path)
        })

        let membershipValid = MerkleTreeUtils.checkMembership(treeWitness, state.stateRoot, transition.path, transition.from.value)
        membershipValid.or(transition.from.isSome.not())
            .assertTrue("MerkleWitness not valid for StateTransition (" + i + ")")

        let newRoot = MerkleTreeUtils.computeRoot(treeWitness, transition.to.value)
        state.stateRoot = Circuit.if(transition.to.isSome, newRoot, state.stateRoot)

        state.stateTransitionList.push(transition.hash())

    }

    getZkProgram() {

    }

    getProofType() : SelfProof<StateTransitionProverPublicInput>{
        throw new Error()
    }

    private createZkProgram(){

        const instance = this; //Closure (though I don't know if actually needed)

        const program = Experimental.ZkProgram({
            publicInput: StateTransitionProverPublicInput,
            methods: {
                proveBatch: {
                    privateInputs: [Field, ProvableStateTransitionBatch],
                    method(
                        publicInput: StateTransitionProverPublicInput,
                        fromStateRoot: Field,
                        batch: ProvableStateTransitionBatch
                    ){

                        publicInput.fromStateRoot.assertEquals(fromStateRoot, "From state-root not matching")

                        let result = instance.applyTransitions(fromStateRoot, publicInput.fromStateTransitionsHash, batch)

                        publicInput.toStateRoot.assertEquals(result.stateRoot, "Resulting state-root not matching")
                        publicInput.toStateTransitionsHash.assertEquals(
                            result.stateTransitionList.commitment,
                            "Resulting state transition commitment not matching")

                    }
                },

                merge: {
                    privateInputs: [SelfProof<StateTransitionProverPublicInput>, SelfProof<StateTransitionProverPublicInput>],
                    method(
                        publicInput: StateTransitionProverPublicInput,
                        proof1: SelfProof<StateTransitionProverPublicInput>,
                        proof2: SelfProof<StateTransitionProverPublicInput>
                    ){

                        //Check state
                        publicInput.fromStateRoot.assertEquals(proof1.publicInput.fromStateRoot, "StateRoot step 1")
                        proof1.publicInput.toStateRoot.assertEquals(proof2.publicInput.fromStateRoot, "StateRoot step 2")
                        proof2.publicInput.toStateRoot.assertEquals(publicInput.toStateRoot, "StateRoot step 3")

                        //Check ST list
                        publicInput.fromStateTransitionsHash.assertEquals(
                            proof1.publicInput.fromStateTransitionsHash,
                            "ST commitment step 1"
                        )
                        proof1.publicInput.toStateTransitionsHash.assertEquals(
                            proof2.publicInput.fromStateTransitionsHash,
                            "ST commitment step 2"
                        )
                        proof2.publicInput.toStateTransitionsHash.assertEquals(
                            publicInput.toStateTransitionsHash,
                            "ST commitment step 3"
                        )
                    }
                }
            }
        })
    }
}

export class StateTransitionProverPublicInput extends Struct({
    fromStateTransitionsHash: Field,
    toStateTransitionsHash: Field,
    fromStateRoot: Field,
    toStateRoot: Field
}) {

}