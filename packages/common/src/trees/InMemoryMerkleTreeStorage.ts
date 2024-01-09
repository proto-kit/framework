import { MerkleTreeStore } from "./MerkleTreeStore";

export class InMemoryMerkleTreeStorage implements MerkleTreeStore {
  protected nodes: {
    [key: number]: {
      [key: string]: bigint;
    };
  } = {};

  public getNode(key: bigint, level: number): bigint | undefined {
    return this.nodes[level]?.[key.toString()];
  }

  public setNode(key: bigint, level: number, value: bigint): void {
    (this.nodes[level] ??= {})[key.toString()] = value;
  }
}
