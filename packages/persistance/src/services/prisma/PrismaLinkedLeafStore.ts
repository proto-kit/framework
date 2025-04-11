import {
  LinkedLeaf,
  log,
  mapSequential,
  noop,
  StoredLeaf,
} from "@proto-kit/common";
import { AsyncLinkedLeafStore } from "@proto-kit/sequencer/dist/state/async/AsyncLinkedLeafStore";

import { PrismaConnection } from "../../PrismaDatabaseConnection";
import { Decimal } from "./PrismaStateService";
import { inject, injectable } from "tsyringe";
import { Tracer } from "@proto-kit/sequencer";
import { RedisMerkleTreeStore } from "../redis/RedisMerkleTreeStore";
import { RedisConnection } from "../../RedisConnection";
import { Prisma } from "@prisma/client";

@injectable()
export class PrismaLinkedLeafStore implements AsyncLinkedLeafStore {
  private cache: StoredLeaf[] = [];

  private redisMerkleStore: RedisMerkleTreeStore;

  public constructor(
    private readonly connection: PrismaConnection,
    redisConnection: RedisConnection,
    tracer: Tracer,
    private readonly mask: string = "base"
  ) {
    this.redisMerkleStore = new RedisMerkleTreeStore(
      redisConnection,
      tracer,
      mask
    );
  }

  public get treeStore() {
    return this.redisMerkleStore;
  }

  private assertCacheEmpty() {
    if (this.cache.length > 0) {
      throw new Error("For this operation, the cache must be empty");
    }
  }

  public async openTransaction(): Promise<void> {
    noop();
  }

  public async commit(): Promise<void> {
    if (this.cache.length > 0) {
      const data = this.cache.map((entry) => ({
        path: entry.leaf.path.toString(),
        value: entry.leaf.value.toString(),
        nextPath: entry.leaf.nextPath.toString(),
        index: entry.index.toString(),
        mask: this.mask,
      }));

      await this.connection.prismaClient.linkedLeaf.deleteMany({
        where: {
          path: {
            in: data.map((entry) => entry.path),
          },
          mask: this.mask,
        },
      });

      await this.connection.prismaClient.linkedLeaf.createMany({
        data,
        skipDuplicates: false,
      });

      this.cache = [];
    }
  }

  public writeLeaves(leaves: StoredLeaf[]) {
    this.cache = this.cache.concat(leaves);
  }

  public async getLeavesAsync(paths: bigint[]) {
    this.assertCacheEmpty();

    const pathsDecimal = paths.map((path) => new Decimal(path.toString(10)));
    const records = await this.connection.prismaClient.linkedLeaf.findMany({
      where: {
        path: {
          in: pathsDecimal,
        },
        mask: this.mask,
      },
    });

    return records.map<StoredLeaf>((record) => {
      return {
        index: BigInt(record.index.toFixed()),
        leaf: {
          path: BigInt(record.path.toFixed()),
          value: BigInt(record.value.toFixed()),
          nextPath: BigInt(record.nextPath.toFixed()),
        },
      };
    });
  }

  public async getMaximumIndexAsync() {
    this.assertCacheEmpty();

    const result = await this.connection.prismaClient.linkedLeaf.aggregate({
      _max: {
        index: true,
      },
    });
    const maximumIndexString = result._max.index?.toFixed();
    return maximumIndexString !== undefined
      ? BigInt(maximumIndexString)
      : undefined;
  }

  public async getLeavesLessOrEqualAsync(paths: bigint[]) {
    this.assertCacheEmpty();

    const pathsDecimals = paths.map((path) => new Decimal(path.toString(10)));
    type LinkedLeafQueryResult = {
      index: Prisma.Decimal;
      path: Prisma.Decimal;
      nextPath: Prisma.Decimal;
      value: Prisma.Decimal;
      mask: string;
    };
    const result = await this.connection.prismaClient.$queryRaw<
      ({
        query_path: Prisma.Decimal;
      } & LinkedLeafQueryResult)[]
    >`
      SELECT * FROM "LinkedLeaf" l
        RIGHT JOIN (SELECT unnest(ARRAY[${pathsDecimals}]) as newpath) f 
        ON l.path < f.newpath AND l."nextPath" > f.newpath
        WHERE l.mask = '1'
    `;

    const map: Record<string, LinkedLeafQueryResult> = Object.fromEntries(
      result.map((obj) => [obj.query_path.toFixed(), obj])
    );

    return paths.map((path) => {
      const record = map[path.toString()];
      if (record !== undefined) {
        return {
          index: BigInt(record.index.toFixed()),
          leaf: {
            path: BigInt(record.index.toFixed()),
            value: BigInt(record.value.toFixed()),
            nextPath: BigInt(record.nextPath.toFixed()),
          },
        };
      }
      return undefined;
    });
  }
}
