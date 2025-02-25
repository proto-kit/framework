import {
  AsyncMerkleTreeStore,
  InMemoryMerkleTreeStoreMask,
  MaskGraph,
  TreeStoreCreator,
} from "@proto-kit/sequencer";

import { RedisMerkleTreeStore } from "../services/redis/RedisMerkleTreeStore";

export class RedisTreeStoreCreator
  extends MaskGraph<
    AsyncMerkleTreeStore,
    RedisMerkleTreeStore,
    InMemoryMerkleTreeStoreMask
  >
  implements TreeStoreCreator {}
