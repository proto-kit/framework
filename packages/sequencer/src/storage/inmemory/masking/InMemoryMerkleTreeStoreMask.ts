import { AsyncMerkleTreeStore } from "../../../state/async/AsyncMerkleTreeStore";
import { CachedMerkleTreeStore } from "../../../state/merkle/CachedMerkleTreeStore";
import { InMemoryAsyncMerkleTreeStore } from "../InMemoryAsyncMerkleTreeStore";

export class InMemoryMerkleTreeStoreMask extends CachedMerkleTreeStore {
  public constructor(
    parent: AsyncMerkleTreeStore,
    public readonly maskName: string
  ) {
    super(parent);
  }

  public async createMask(
    maskName: string
  ): Promise<InMemoryMerkleTreeStoreMask> {
    return new InMemoryMerkleTreeStoreMask(this, maskName);
  }
}

export class InMemoryBaseMerkleTreeStore extends InMemoryAsyncMerkleTreeStore {
  public maskName = "base";

  public async createMask(
    maskName: string
  ): Promise<InMemoryMerkleTreeStoreMask> {
    return new InMemoryMerkleTreeStoreMask(this, maskName);
  }
}
