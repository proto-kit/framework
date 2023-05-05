import {Bool, Circuit, Field, Poseidon, Struct} from 'snarkyjs';
import {NotInCircuit, Struct2} from "../../Utils.js";

// external API
export { RollupMerkleTree, RollupMerkleWitness };

// internal API
export { maybeSwap };

export interface Virtualizable<T> {
    parent: T
    virtualize(): T
}

export interface MerkleTreeStore extends Virtualizable<MerkleTreeStore> {

    openTransaction() : void
    commit() : void

    setNodeAsync(key: bigint, level: number, value: bigint) : Promise<void>

    getNodeAsync(key: bigint, level: number) : Promise<bigint | undefined>

}
export interface SyncMerkleTreeStore extends MerkleTreeStore {
    setNode(key: bigint, level: number, value: bigint) : void

    getNode(key: bigint, level: number) : bigint | undefined
}


/**
 * The {@link BaseMerkleWitness} class defines a circuit-compatible base class for [Merkle Witness'](https://computersciencewiki.org/index.php/Merkle_proof).
 */
class RollupMerkleWitness extends Struct({
    path: Circuit.array(Field, 256 - 1),
    isLeft: Circuit.array(Bool, 256 - 1)
}) {

    static height = 256;

    height(): number {
        return (this.constructor as any).height;
    }

    /**
     * Calculates a root depending on the leaf value.
     * @param leaf Value of the leaf node that belongs to this Witness.
     * @returns The calculated root.
     */
    calculateRoot(leaf: Field): Field {
        let hash = leaf;
        let n = this.height();

        for (let i = 1; i < n; ++i) {
            let isLeft = this.isLeft[i - 1];
            const [left, right] = maybeSwap(isLeft, hash, this.path[i - 1]);
            hash = Poseidon.hash([left, right]);
        }

        return hash;
    }

    /**
     * Calculates the index of the leaf node that belongs to this Witness.
     * @returns Index of the leaf.
     */
    calculateIndex(): Field {
        let powerOfTwo = Field(1);
        let index = Field(0);
        let n = this.height();

        for (let i = 1; i < n; ++i) {
            index = Circuit.if(this.isLeft[i - 1], index, index.add(powerOfTwo));
            powerOfTwo = powerOfTwo.mul(2);
        }

        return index;
    }
}

/**
 * A [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree) is a binary tree in which every leaf is the cryptography hash of a piece of data,
 * and every node is the hash of the concatenation of its two child nodes.
 *
 * A Merkle Tree allows developers to easily and securely verify the integrity of large amounts of data.
 *
 * Take a look at our [documentation](https://docs.minaprotocol.com/en/zkapps) on how to use Merkle Trees in combination with zkApps and zero knowledge programming!
 *
 * Levels are indexed from leaves (level 0) to root (level N - 1).
 */
class RollupMerkleTree {
    private zeroes: bigint[];

    static height = 256

    readonly store: SyncMerkleTreeStore

    constructor(store: SyncMerkleTreeStore) {
        this.store = store
        this.zeroes = [0n];
        for (let i = 1; i < RollupMerkleTree.height; i++) {
            let previousLevel = Field(this.zeroes[i - 1])
            this.zeroes.push(Poseidon.hash([previousLevel, previousLevel]).toBigInt());
        }
    }

    /**
     * Returns a node which lives at a given index and level.
     * @param level Level of the node.
     * @param index Index of the node.
     * @returns The data of the node.
     */
    @NotInCircuit()
    getNode(level: number, index: bigint): Field {
        return Field(this.store.getNode(index, level) ?? this.zeroes[level]);
    }

    /**
     * Returns the root of the [Merkle Tree](https://en.wikipedia.org/wiki/Merkle_tree).
     * @returns The root of the Merkle Tree.
     */
    @NotInCircuit()
    getRoot(): Field {
        return this.getNode(RollupMerkleTree.height - 1, 0n);
    }

    // TODO: this allows to set a node at an index larger than the size. OK?
    private setNode(level: number, index: bigint, value: Field) {
        this.store.setNode(index, level, value.toBigInt())
    }

    // TODO: if this is passed an index bigger than the max, it will set a couple of out-of-bounds nodes but not affect the real Merkle root. OK?
    /**
     * Sets the value of a leaf node at a given index to a given value.
     * @param index Position of the leaf node.
     * @param leaf New value.
     */
    @NotInCircuit()
    setLeaf(index: bigint, leaf: Field) {
        if (index >= this.leafCount) {
            index = index % this.leafCount
        }
        this.store.openTransaction()
        this.setNode(0, index, leaf);
        let currIndex = index;
        for (let level = 1; level < RollupMerkleTree.height; level++) {
            currIndex /= 2n;

            const left = this.getNode(level - 1, currIndex * 2n);
            const right = this.getNode(level - 1, currIndex * 2n + 1n);

            this.setNode(level, currIndex, Poseidon.hash([left, right]));
        }
        this.store.commit()
    }

    /**
     * Returns the witness (also known as [Merkle Proof or Merkle Witness](https://computersciencewiki.org/index.php/Merkle_proof)) for the leaf at the given index.
     * @param index Position of the leaf node.
     * @returns The witness that belongs to the leaf.
     */
    @NotInCircuit()
    getWitness(index: bigint): RollupMerkleWitness {
        console.log("LC", this.leafCount)
        if (index >= this.leafCount) {
            index = index % this.leafCount
        }
        const path = [];
        const isLefts = []
        for (let level = 0; level < RollupMerkleTree.height - 1; level++) {
            const isLeft = index % 2n === 0n;
            const sibling = this.getNode(level, isLeft ? index + 1n : index - 1n);
            isLefts.push(Bool(isLeft))
            path.push(sibling)
            index /= 2n;
        }
        let witness = new RollupMerkleWitness({
            isLeft: isLefts,
            path: path
        })
        return witness;
    }

    // TODO: this will always return true if the merkle tree was constructed normally; seems to be only useful for testing. remove?
    /**
     * Checks if the witness that belongs to the leaf at the given index is a valid witness.
     * @param index Position of the leaf node.
     * @returns True if the witness for the leaf node is valid.
     */
    @NotInCircuit()
    validate(index: bigint): boolean {
        if (index >= this.leafCount) {
            index = index % this.leafCount
        }
        const path = this.getWitness(index);
        let hash = this.getNode(0, index);
        for (let i = 0 ; i < path.path.length ; i++) {
            let isLeft = path.isLeft[i]
            let sibling = path.path[i]
            hash = Poseidon.hash(
                isLeft ? [hash, sibling] : [sibling, hash]
            );
        }

        return hash.toString() === this.getRoot().toString();
    }

    // TODO: should this take an optional offset? should it fail if the array is too long?
    /**
     * Fills all leaves of the tree.
     * @param leaves Values to fill the leaves with.
     */
    @NotInCircuit()
    fill(leaves: Field[]) {
        leaves.forEach((value, index) => {
            this.setLeaf(BigInt(index), value);
        });
    }

    /**
     * Returns the amount of leaf nodes.
     * @returns Amount of leaf nodes.
     */
    get leafCount(): bigint {
        return RollupMerkleTree.leafCount
    }

    static get leafCount(): bigint {
        return 2n ** BigInt(RollupMerkleTree.height - 1);
    }
}

export namespace MerkleTreeUtils {

    export function normalizeKey(key: Field) : Field{
        // if(NJORD_MERKLE_TREE_HEIGHT < 256){
        //     return fieldMod(key, Field(RollupMerkleTree.leafCount).toConstant())
        //     // return modPower2(key, RollupMerkleTree.height - 1) //TODO Fix modPower2
        // }else{
            return key
        // }
    }

    export function checkMembership(
        witness: RollupMerkleWitness,
        root: Field,
        key: Field,
        value: Field
    ): Bool {
        let root2 = witness.calculateRoot(value)
        let key2 = witness.calculateIndex()
        key.assertEquals(key2, "Keys of MerkleWitness does not match")
        return root.equals(root2)
    }

    export function computeRoot(
        witness: RollupMerkleWitness,
        value: Field
    ) : Field {

        return witness.calculateRoot(value)

    }
}

// more efficient version of `maybeSwapBad` which reuses an intermediate variable
function maybeSwap(b: Bool, x: Field, y: Field): [Field, Field] {
    let m = b.toField().mul(x.sub(y)); // b*(x - y)
    const x_ = y.add(m); // y + b*(x - y)
    const y_ = x.sub(m); // x - b*(x - y) = x + b*(y - x)
    return [x_, y_];
}
