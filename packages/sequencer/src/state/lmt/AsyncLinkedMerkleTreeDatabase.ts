import { AsyncMerkleTreeStore } from "../async/AsyncMerkleTreeStore";
import { AsyncLinkedLeafStore } from "../async/AsyncLinkedLeafStore";

export interface AsyncLinkedMerkleTreeDatabase {
  treeStore: AsyncMerkleTreeStore;
  leafStore: AsyncLinkedLeafStore;
}
