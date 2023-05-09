import { type MerkleTreeStore, RollupMerkleTree, type SyncMerkleTreeStore } from "./RollupMerkleTree.js";

export class NoOpMerkleTreeStorage implements SyncMerkleTreeStore {
    public parent: MerkleTreeStore = this

    public openTransaction(): void {
    }

    public commit(): void {
    }

    public getNode(): bigint | undefined {
        return undefined;
    }

    public setNode(): void {}

    public virtualize(): MerkleTreeStore {
        return this;
    }

    public async getNodeAsync(): Promise<bigint | undefined> {
        return undefined;
    }

    public async setNodeAsync(): Promise<void> {
        return undefined;
    }

}

export class MemoryMerkleTreeStorage implements SyncMerkleTreeStore {

    private readonly nodes: Record<number, Record<string, bigint>> = {}

    private readonly cache: Record<number, Record<string, bigint>> = {}

    public parent: SyncMerkleTreeStore

    public constructor(parent: SyncMerkleTreeStore | undefined = undefined) {
        this.parent = parent ?? new NoOpMerkleTreeStorage()
    }

    public openTransaction(): void {
    }

    public commit(): void {
    }

    public getNode(key: bigint, level: number): bigint | undefined {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return this.nodes[level][key.toString()]
            ?? this.cache[level][key.toString()]
            ?? this.parent.getNode(key, level);
    }

    public setNode(key: bigint, level: number, value: bigint): void {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        (this.nodes[level] ??= {})[key.toString()] = value
    }

    public virtualize(): MerkleTreeStore {
        return new MemoryMerkleTreeStorage(this)
    }

    public async getNodeAsync(key: bigint, level: number): Promise<bigint | undefined> {
        return this.getNode(key, level);
    }

    public async setNodeAsync(key: bigint, level: number, value: bigint): Promise<void> {
        this.setNode(key, level, value)
        return undefined;
    }

    public async cacheFromParent(index: bigint) {
        // Algo from RollupMerkleTree.getWitness()
        const { leafCount, height } = RollupMerkleTree;

        if (index >= leafCount) {
            index %= leafCount
        }

        for (let level = 0; level < height - 1; level++) {
            const isLeft = index % 2n === 0n;

            const key = isLeft ? (index + 1n) : (index - 1n);
            const value = await this.parent.getNodeAsync(key, level);
            if (value !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                (this.nodes[level] ??= {})[key.toString()] = value
            }
            index /= 2n;
        }
    }

}