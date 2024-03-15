export interface MerkleTreeNodeQuery {
  key: bigint;
  level: number;
}

export interface MerkleTreeNode extends MerkleTreeNodeQuery {
  value: bigint;
}

export interface AsyncMerkleTreeStore {
  openTransaction: () => Promise<void>;

  commit: () => Promise<void>;

  writeNodes: (nodes: MerkleTreeNode[]) => void;

  getNodesAsync: (
    nodes: MerkleTreeNodeQuery[]
  ) => Promise<(bigint | undefined)[]>;
}
