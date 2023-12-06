import {
  InMemoryMerkleTreeStorage, MerkleTreeStore,
  RollupMerkleTree
} from "@proto-kit/protocol";

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

    const { height } = RollupMerkleTree;
    const { nodes } = this;

    Array.from({ length: height }).forEach((ignored, level) =>
      Object.entries(nodes[level]).forEach((entry) => {
        this.parent.setNode(BigInt(entry[0]), level, entry[1]);
      })
    );

    this.nodes = {}
  }
}