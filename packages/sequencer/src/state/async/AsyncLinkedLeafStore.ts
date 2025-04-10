import { StoredLeaf } from "@proto-kit/common";

import { AsyncMerkleTreeStore } from "./AsyncMerkleTreeStore";

export interface AsyncLinkedLeafStore {
  treeStore: AsyncMerkleTreeStore;

  openTransaction: () => Promise<void>;

  commit: () => Promise<void>;

  writeLeaves: (leaves: StoredLeaf[]) => void;

  getLeavesAsync: (paths: bigint[]) => Promise<(StoredLeaf | undefined)[]>;

  getMaximumIndexAsync: () => Promise<bigint | undefined>;

  getLeafLessOrEqualAsync: (path: bigint) => Promise<StoredLeaf | undefined>;
}
