import {
  sequencerModule,
  SequencerModule,
  StorageDependencyMinimumDependencies,
  Database,
  closeable,
  Tracer,
} from "@proto-kit/sequencer";
import { ChildContainerProvider } from "@proto-kit/common";
import { PrismaClient } from "@prisma/client";
import { RedisClientType } from "redis";
import { inject } from "tsyringe";

import {
  PrismaConnection,
  PrismaDatabaseConfig,
  PrismaDatabaseConnection,
} from "./PrismaDatabaseConnection";
import {
  RedisConnection,
  RedisConnectionConfig,
  RedisConnectionModule,
  RedisTransaction,
} from "./RedisConnection";
import { PrismaLinkedLeafStore } from "./services/prisma/PrismaLinkedLeafStore";

export interface PrismaRedisCombinedConfig {
  prisma: PrismaDatabaseConfig;
  redis: RedisConnectionConfig;
}

@sequencerModule()
@closeable()
export class PrismaRedisDatabase
  extends SequencerModule<PrismaRedisCombinedConfig>
  implements PrismaConnection, RedisConnection, Database
{
  public prisma: PrismaDatabaseConnection;

  public redis: RedisConnectionModule;

  public constructor(@inject("Tracer") private readonly tracer: Tracer) {
    super();
    this.prisma = new PrismaDatabaseConnection(tracer);
    this.redis = new RedisConnectionModule(tracer);
  }

  public get prismaClient(): PrismaClient {
    return this.prisma.prismaClient;
  }

  public get redisClient(): RedisClientType {
    return this.redis.redisClient;
  }

  public get currentMulti(): RedisTransaction {
    return this.redis.currentMulti;
  }

  public create(childContainerProvider: ChildContainerProvider) {
    super.create(childContainerProvider);
    this.prisma.create(childContainerProvider);
    this.redis.create(childContainerProvider);
  }

  public dependencies(): StorageDependencyMinimumDependencies {
    return {
      ...this.prisma.dependencies(),
      ...this.redis.dependencies(),

      asyncLinkedLeafStore: {
        useFactory: () => {
          return new PrismaLinkedLeafStore(
            this.prisma,
            this.redis,
            this.tracer,
            "batch"
          );
        },
      },

      unprovenLinkedLeafStore: {
        useFactory: () => {
          return new PrismaLinkedLeafStore(
            this.prisma,
            this.redis,
            this.tracer,
            "block"
          );
        },
      },
    };
  }

  public async start(): Promise<void> {
    this.prisma.config = this.config.prisma;
    await this.prisma.start();

    this.redis.config = this.config.redis;
    await this.redis.start();
  }

  public async close() {
    await this.prisma.close();
    await this.redis.close();
  }

  public async pruneDatabase(): Promise<void> {
    await this.prisma.pruneDatabase();
    await this.redis.pruneDatabase();
  }

  public async executeInTransaction(f: () => Promise<void>) {
    // TODO Long-term we want to somehow make sure we can rollback one data source
    //  if commiting the other one's transaction fails
    await this.prisma.executeInTransaction(async () => {
      await this.redis.executeInTransaction(f);
    });
  }
}
