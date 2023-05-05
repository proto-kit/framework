import { MerkleTreeStore, RollupMerkleTree, SyncMerkleTreeStore} from "./RollupMerkleTree.js";

export class NoOpMerkleTreeStorage implements SyncMerkleTreeStore {
    parent: MerkleTreeStore = this
    openTransaction(): void {}
    commit(): void {}
    getNode(key: bigint, level: number): bigint | undefined {
        return undefined;
    }
    setNode(key: bigint, level: number, value: bigint): void {}
    virtualize(): MerkleTreeStore { return this; }
    getNodeAsync(key: bigint, level: number): Promise<bigint | undefined> {
        return Promise.resolve(undefined);
    }
    setNodeAsync(key: bigint, level: number, value: bigint): Promise<void> {
        return Promise.resolve(undefined);
    }

}

export class MemoryMerkleTreeStorage implements SyncMerkleTreeStore {

    private nodes: Record<number, Record<string, bigint>> = {}
    private cache: Record<number, Record<string, bigint>> = {}
    parent: SyncMerkleTreeStore

    constructor(parent: SyncMerkleTreeStore | undefined = undefined) {
        this.parent = parent ?? new NoOpMerkleTreeStorage()
    }

    openTransaction() : void {
    }

    commit(): void {
    }

    getNode(key: bigint, level: number): bigint | undefined {
        return this.nodes[level]?.[key.toString()]
            ?? this.cache[level]?.[key.toString()]
        ?? this.parent.getNode(key, level);
    }

    setNode(key: bigint, level: number, value: bigint): void {
        (this.nodes[level] ??= {})[key.toString()] = value
    }

    virtualize() : MerkleTreeStore {
        return new MemoryMerkleTreeStorage(this)
    }

    getNodeAsync(key: bigint, level: number): Promise<bigint | undefined> {
        return Promise.resolve(this.getNode(key, level));
    }

    setNodeAsync(key: bigint, level: number, value: bigint): Promise<void> {
        this.setNode(key, level, value)
        return Promise.resolve(undefined);
    }

    async cacheFromParent(index: bigint){
        //Algo from RollupMerkleTree.getWitness()
        let leafCount = RollupMerkleTree.leafCount
        if (index >= leafCount) {
            index = index % leafCount
        }
        for (let level = 0; level < RollupMerkleTree.height - 1; level++) {
            const isLeft = index % 2n === 0n;

            let key = isLeft ? (index + 1n) : (index - 1n);
            let value = await this.parent.getNodeAsync(key, level);
            if(value){
                (this.nodes[level] ??= {})[key.toString()] = value
            }
            index /= 2n;
        }
    }

}