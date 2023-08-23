export interface AsyncMerkleTreeStore {
  openTransaction: () => void;

  commit: () => void;

  setNode: (key: bigint, level: number, value: bigint) => Promise<void>;

  getNode: (key: bigint, level: number) => Promise<bigint | undefined>;
}

export interface MerkleTreeStore {
  setNode: (key: bigint, level: number, value: bigint) => void;

  getNode: (key: bigint, level: number) => bigint | undefined;
}
