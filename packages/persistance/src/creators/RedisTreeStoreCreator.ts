import {
  AsyncMerkleTreeStore,
  InMemoryMerkleTreeStoreMask,
  MaskGraph,
  TreeStoreCreator,
} from "@proto-kit/sequencer";

import { RedisMerkleTreeStore } from "../services/redis/RedisMerkleTreeStore";
import type { RedisConnection } from "../RedisConnection";

export class RedisTreeStoreCreator
  extends MaskGraph<
    AsyncMerkleTreeStore,
    RedisMerkleTreeStore,
    InMemoryMerkleTreeStoreMask
  >
  implements TreeStoreCreator
{
  public constructor(connection: RedisConnection, prefix: string) {
    super(new RedisMerkleTreeStore(connection, prefix, "base"));
  }
}
