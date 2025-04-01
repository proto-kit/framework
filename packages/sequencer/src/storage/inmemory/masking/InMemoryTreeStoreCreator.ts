import { MaskGraph } from "../../../state/masking/MaskGraph";
import { AsyncMerkleTreeStore } from "../../../state/async/AsyncMerkleTreeStore";
import { TreeStoreCreator } from "../../../state/masking/TreeStoreCreator";

import {
  InMemoryBaseMerkleTreeStore,
  InMemoryMerkleTreeStoreMask,
} from "./InMemoryMerkleTreeStoreMask";

export class InMemoryTreeStoreCreator
  extends MaskGraph<
    AsyncMerkleTreeStore,
    InMemoryBaseMerkleTreeStore,
    InMemoryMerkleTreeStoreMask
  >
  implements TreeStoreCreator
{
  public constructor() {
    super(new InMemoryBaseMerkleTreeStore());
  }
}
