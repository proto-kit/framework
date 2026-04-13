import { StoredLeaf } from "@proto-kit/common";

export interface AsyncLinkedLeafStore {
  openTransaction: () => Promise<void>;

  commit: () => Promise<void>;

  writeLeaves: (leaves: StoredLeaf[]) => void;

  getLeavesAsync: (paths: bigint[]) => Promise<(StoredLeaf | undefined)[]>;

  getMaximumIndexAsync: () => Promise<bigint | undefined>;

  getPreviousLeavesAsync: (
    path: bigint[]
  ) => Promise<(StoredLeaf | undefined)[]>;
}
