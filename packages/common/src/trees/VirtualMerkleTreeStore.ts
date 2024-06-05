import { MerkleTreeStore } from "./MerkleTreeStore";
import { InMemoryMerkleTreeStorage } from "./InMemoryMerkleTreeStorage";

/**
 * A MemoryMerkleTreeStore that, if falls back to a parent store if it
 * has no data
 */
export class VirtualMerkleTreeStore extends InMemoryMerkleTreeStorage {
  public constructor(private readonly parent: MerkleTreeStore) {
    super();
  }

  public getNode(key: bigint, level: number): bigint | undefined {
    return super.getNode(key, level) ?? this.parent.getNode(key, level);
  }

  public setNode(key: bigint, level: number, value: bigint): void {
    super.setNode(key, level, value);
  }
}
