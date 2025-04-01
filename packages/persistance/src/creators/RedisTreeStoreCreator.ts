import {
  AsyncMerkleTreeStore,
  InMemoryMerkleTreeStoreMask,
  MaskGraph,
  Tracer,
  TreeStoreCreator,
} from "@proto-kit/sequencer";
import { inject, injectable } from "tsyringe";

import { RedisMerkleTreeStore } from "../services/redis/RedisMerkleTreeStore";
import type { RedisConnection } from "../RedisConnection";

@injectable()
export class RedisTreeStoreCreator
  extends MaskGraph<
    AsyncMerkleTreeStore,
    RedisMerkleTreeStore,
    InMemoryMerkleTreeStoreMask
  >
  implements TreeStoreCreator
{
  public constructor(
    @inject("Database") connection: RedisConnection,
    @inject("Tracer") tracer: Tracer
  ) {
    super(new RedisMerkleTreeStore(connection, tracer, "base"));
  }
}
