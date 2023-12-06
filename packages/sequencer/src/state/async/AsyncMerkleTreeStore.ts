export interface AsyncMerkleTreeStore {
  openTransaction: () => void;

  commit: () => void;

  setNodeAsync: (key: bigint, level: number, value: bigint) => Promise<void>;

  getNodeAsync: (key: bigint, level: number) => Promise<bigint | undefined>;
}