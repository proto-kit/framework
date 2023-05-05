import {Bool, Field, isReady, shutdown} from "snarkyjs";
import {RollupMerkleTree, RollupMerkleWitness} from "../prover/utils/RollupMerkleTree.js";
import {Option, ProvableStateTransition} from "../prover/statetransition/StateTransition.js";
import {container} from "tsyringe";
import {
    ProvableStateTransitionBatch,
    StateTransitionProver,
    StateTransitionWitnessProvider
} from "../prover/statetransition/StateTransitionProver.js";
import {MemoryMerkleTreeStorage} from "../prover/utils/MemoryMerkleTreeStorage.js";
import {DefaultProvableMerkleList} from "../prover/utils/ProvableMerkleList.js";

describe("StateTransition", () => {

    beforeAll(() => {
        return isReady
    })

    afterAll(() => {
        setTimeout(shutdown, 0)
    })

    function checkTransitions(tree: RollupMerkleTree, transitions: ProvableStateTransition[]){

        let batch = ProvableStateTransitionBatch.fromTransitions(transitions)

        let tempTree = new RollupMerkleTree(tree.store.virtualize() as MemoryMerkleTreeStorage)
        let startRoot = tempTree.getRoot()

        let hashList = new DefaultProvableMerkleList()

        batch.batch.forEach(x => {
            if(x.to.isSome.toBoolean()){
                tempTree.setLeaf(x.path.toBigInt(), x.to.value)
            }
            hashList.push(x.hash())
        })

        let endRoot = tempTree.getRoot()

        class DummySTWP implements StateTransitionWitnessProvider {

            tree: RollupMerkleTree

            constructor(tree: RollupMerkleTree) {
                this.tree = tree
            }

            i = 0
            getWitness(key: Field): RollupMerkleWitness {
                let witness = tree.getWitness(key.toBigInt())
                let set = batch.batch[this.i]
                if(set.to.isSome.toBoolean()){
                    tree.setLeaf(key.toBigInt(), set.to.value)
                }
                this.i++
                return witness;
            }
        }

        let childContainer = container.createChildContainer()
        childContainer.registerInstance("StateTransitionWitnessProvider", new DummySTWP(tree))
        let prover = childContainer.resolve(StateTransitionProver)

        let state = prover.applyTransitions(startRoot, Field(0), batch)

        expect(state.stateRoot).toEqual(endRoot)
        expect(state.stateTransitionList.commitment).toEqual(hashList.commitment)

        childContainer.dispose()

    }

    it("should pass without throwing", () => {

        let tree = new RollupMerkleTree(new MemoryMerkleTreeStorage())

        tree.setLeaf(1n, Option.value(Field(1), Field).treeValue) //Is ignored because overwritten by first transition
        tree.setLeaf(2n, Option.value(Field(5), Field).treeValue)

        let transitions = [
            new ProvableStateTransition({
                from: Option.none(),
                to: Option.from(Bool(true), Field(14), Field).toProvable(),
                path: Field(1)
            }),
            new ProvableStateTransition({
                from: Option.from(Bool(true), Field(14), Field).toProvable(),
                to: Option.from(Bool(true), Field(4), Field).toProvable(),
                path: Field(1)
            }),
            new ProvableStateTransition({
                from: Option.from(Bool(true), Field(5), Field).toProvable(),
                to: Option.from(Bool(true), Field(2), Field).toProvable(),
                path: Field(2)
            }),
            new ProvableStateTransition({
                from: Option.from(Bool(true), Field(2), Field).toProvable(),
                to: Option.none(),
                path: Field(2)
            })
        ]

        checkTransitions(tree, transitions)

    })

    it("Should throw because of failing precondition", () => {

        let tree = new RollupMerkleTree(new MemoryMerkleTreeStorage())

        tree.setLeaf(1n, Option.value(Field(1), Field).treeValue) //Is ignored because overwritten by first transition
        tree.setLeaf(2n, Option.value(Field(5), Field).treeValue)

        let transitions = [
            new ProvableStateTransition({ //success
                from: Option.from(Bool(true), Field(1), Field).toProvable(),
                to: Option.from(Bool(true), Field(14), Field).toProvable(),
                path: Field(1)
            }),
            new ProvableStateTransition({ //fail
                from: Option.from(Bool(true), Field(6), Field).toProvable(),
                to: Option.none(),
                path: Field(2)
            }),
        ]

        expect(
            () => checkTransitions(tree, transitions)
        ).toThrow("MerkleWitness not valid for StateTransition (1)")

    })

})