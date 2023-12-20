import {
  InMemoryMerkleTreeStorage,
  MerkleTreeStore,
  RollupMerkleTree,
} from "@proto-kit/common";

export class SyncCachedMerkleTreeStore extends InMemoryMerkleTreeStorage {
  public constructor(private readonly parent: MerkleTreeStore) {
    super();
  }

  public getNode(key: bigint, level: number): bigint | undefined {
    return super.getNode(key, level) ?? this.parent.getNode(key, level);
  }

  public setNode(key: bigint, level: number, value: bigint) {
    super.setNode(key, level, value);
  }

  public mergeIntoParent() {
    if (Object.keys(this.nodes).length === 0) {
      return;
    }

    const { nodes } = this;

    Array.from({ length: RollupMerkleTree.HEIGHT }).forEach((ignored, level) =>
      Object.entries(nodes[level]).forEach((entry) => {
        this.parent.setNode(BigInt(entry[0]), level, entry[1]);
      })
    );

    this.nodes = {};
  }
}
