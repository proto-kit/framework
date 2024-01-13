import { noop, InMemoryMerkleTreeStorage } from "@proto-kit/common";

import {
  AsyncMerkleTreeStore,
  MerkleTreeNode,
  MerkleTreeNodeQuery,
} from "../../state/async/AsyncMerkleTreeStore";

export class InMemoryAsyncMerkleTreeStore implements AsyncMerkleTreeStore {
  private readonly store = new InMemoryMerkleTreeStorage();

  public writeNodes(nodes: MerkleTreeNode[]): void {
    nodes.forEach(({ key, level, value }) =>
      this.store.setNode(key, level, value)
    );
  }

  public async commit(): Promise<void> {
    noop();
  }

  public async openTransaction(): Promise<void> {
    noop();
  }

  public async getNodesAsync(
    nodes: MerkleTreeNodeQuery[]
  ): Promise<(bigint | undefined)[]> {
    return nodes.map(({ key, level }) => this.store.getNode(key, level));
  }
}
