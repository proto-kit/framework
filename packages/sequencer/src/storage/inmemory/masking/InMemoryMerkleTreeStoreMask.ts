import { AsyncMerkleTreeStore } from "../../../state/async/AsyncMerkleTreeStore";
import { CachedMerkleTreeStore } from "../../../state/merkle/CachedMerkleTreeStore";
import { InMemoryAsyncMerkleTreeStore } from "../InMemoryAsyncMerkleTreeStore";

export class InMemoryMerkleTreeStoreMask extends CachedMerkleTreeStore {
  public constructor(
    parent: AsyncMerkleTreeStore,
    public readonly name: string
  ) {
    super(parent);
  }

  public async createMask(name: string): Promise<InMemoryMerkleTreeStoreMask> {
    return new InMemoryMerkleTreeStoreMask(this, name);
  }
}

export class InMemoryBaseMerkleTreeStore extends InMemoryAsyncMerkleTreeStore {
  public name = "base";

  public async createMask(name: string): Promise<InMemoryMerkleTreeStoreMask> {
    return new InMemoryMerkleTreeStoreMask(this, name);
  }
}
