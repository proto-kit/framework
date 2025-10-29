export interface MerkleTreeStore {
  setNode: (key: bigint, level: number, value: bigint) => void;

  getNode: (key: bigint, level: number) => bigint | undefined;
}
