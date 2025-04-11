export type LinkedLeaf = { value: bigint; path: bigint; nextPath: bigint };

export type StoredLeaf = { leaf: LinkedLeaf; index: bigint };

export interface LinkedLeafStore {
  setLeaf: (index: bigint, value: LinkedLeaf) => void;

  getLeaf: (path: bigint) => StoredLeaf | undefined;

  getLeafLessOrEqual: (path: bigint) => StoredLeaf | undefined;

  getMaximumIndex: () => bigint | undefined;
}
