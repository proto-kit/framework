import { MerkleTreeStore } from "../sparse/MerkleTreeStore";

export interface LinkedLeafStore {
  setLeaf: (index: bigint, value: LinkedLeaf) => void;

  getLeaf: (path: bigint) => { leaf: LinkedLeaf; index: bigint } | undefined;

  getLeafLessOrEqual: (
    path: bigint
  ) => { leaf: LinkedLeaf; index: bigint } | undefined;

  getMaximumIndex: () => bigint | undefined;
}

export type LinkedLeaf = { value: bigint; path: bigint; nextPath: bigint };
export interface LinkedMerkleTreeStore
  extends LinkedLeafStore,
    MerkleTreeStore {}

export interface PreloadingLinkedMerkleTreeStore extends LinkedMerkleTreeStore {
  preloadKeys(path: bigint[]): Promise<void>;
}
