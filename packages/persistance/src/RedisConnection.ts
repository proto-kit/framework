import { createClient, RedisClientType } from "redis";
import {
  SequencerModule,
  StorageDependencyMinimumDependencies,
  Tracer,
} from "@proto-kit/sequencer";
import { DependencyFactory } from "@proto-kit/common";
import isArray from "lodash/isArray";

import { RedisMerkleTreeStore } from "./services/redis/RedisMerkleTreeStore";
import { RedisTreeStoreCreator } from "./creators/RedisTreeStoreCreator";

export interface RedisConnectionConfig {
  host: string;
  password?: string;
  port?: number;
  username?: string;
}

export type RedisTransaction = ReturnType<RedisClientType["multi"]>;

export interface RedisConnection {
  get redisClient(): RedisClientType;
  get currentMulti(): RedisTransaction;
}

export class RedisConnectionModule
  extends SequencerModule<RedisConnectionConfig>
  implements DependencyFactory, RedisConnection
{
  public constructor(private readonly tracer: Tracer) {
    super();
  }

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
    "blockTreeStore" | "treeStoreCreator"
  > {
    return {
      blockTreeStore: {
        useFactory: () =>
          new RedisMerkleTreeStore(this, this.tracer, "blockHash"),
      },
      treeStoreCreator: {
        useClass: RedisTreeStoreCreator,
      },
    };
  }

  public async clearDatabase() {
    await this.redisClient.flushAll();
  }

  public async init() {
    const { host, port, password, username } = this.config;
    this.client = createClient({
      url: `redis://${host}:${port ?? 6379}`,
      password,
      username,
    });
    try {
      await this.redisClient.connect();
    } catch (error: any) {
      if (error instanceof Error) {
        throw new Error(`Connection to Redis failed: ${error.message}`);
      }
      if (error.errors !== undefined && isArray(error.errors)) {
        const errors = (error.errors as Error[])
          .map((err) => err.message)
          .reduce((a, b) => `${a}\n${b}`);
        throw new Error(`Connection to Redis failed: \n${errors}`);
      }
      throw error;
    }
  }

  public async start(): Promise<void> {
    await this.init();
  }

  public async close() {
    await this.redisClient.disconnect();
  }

  public async pruneDatabase() {
    await this.redisClient.flushDb();
  }

  private multi?: RedisTransaction;

  public get currentMulti() {
    if (this.multi === undefined) {
      throw new Error("Redis multi was access outside of a transaction");
    }
    return this.multi;
  }

  public async executeInTransaction(f: () => Promise<void>) {
    this.multi = this.redisClient.multi();
    await f();
    await this.multi.exec();
    this.multi = undefined;
  }
}
