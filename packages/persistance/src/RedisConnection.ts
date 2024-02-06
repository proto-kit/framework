import { createClient, RedisClientType } from "redis";
import {
  SequencerModule,
  StorageDependencyMinimumDependencies,
} from "@proto-kit/sequencer";
import { DependencyFactory } from "@proto-kit/common";

import { RedisMerkleTreeStore } from "./services/redis/RedisMerkleTreeStore";

export interface RedisConnectionConfig {
  url: string;
  password: string;
}

export interface RedisConnection {
  get redisClient(): RedisClientType;
}

export class RedisConnectionModule
  extends SequencerModule<RedisConnectionConfig>
  implements DependencyFactory, RedisConnection
{
  private client?: RedisClientType;

  public get redisClient(): RedisClientType {
    if (this.client === undefined) {
      throw new Error(
        "Redis client not initialized yet, wait for .start() to be called"
      );
    }
    return this.client;
  }

  public dependencies(): Pick<
    StorageDependencyMinimumDependencies,
    "asyncMerkleStore" | "blockTreeStore" | "unprovenMerkleStore"
  > {
    return {
      asyncMerkleStore: {
        useFactory: () => new RedisMerkleTreeStore(this),
      },
      unprovenMerkleStore: {
        useFactory: () => new RedisMerkleTreeStore(this, "unproven"),
      },
      blockTreeStore: {
        useFactory: () => new RedisMerkleTreeStore(this, "blockHash"),
      },
    };
  }

  public async init() {
    this.client = createClient(this.config);
    try {
      await this.redisClient.connect();
    } catch (e: unknown) {
      if (e instanceof Error) {
        throw new Error(`Connection to Redis failed: ${e.message}`);
      }
      throw e;
    }
  }

  public async start(): Promise<void> {
    await this.init();
  }
}
