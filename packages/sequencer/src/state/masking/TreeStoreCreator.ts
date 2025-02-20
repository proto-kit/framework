import { AsyncMerkleTreeStore } from "../async/AsyncMerkleTreeStore";

export interface TreeStoreCreator {
  createMask(
    name: string,
    parent: string,
    fallback?: string
  ): Promise<AsyncMerkleTreeStore>;
  getMask(name: string): Promise<AsyncMerkleTreeStore>;
  mergeIntoParent(name: string): Promise<void>;
  drop(name: string): Promise<void>;
}
