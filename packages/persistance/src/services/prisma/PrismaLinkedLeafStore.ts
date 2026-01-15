import { noop, StoredLeaf } from "@proto-kit/common";
import { AsyncLinkedLeafStore, Tracer } from "@proto-kit/sequencer";
import { injectable } from "tsyringe";
import { Prisma } from "@prisma/client";

import { PrismaConnection } from "../../PrismaDatabaseConnection";
import { RedisMerkleTreeStore } from "../redis/RedisMerkleTreeStore";
import { RedisConnection } from "../../RedisConnection";

import { Decimal } from "./PrismaStateService";

@injectable()
export class PrismaLinkedLeafStore implements AsyncLinkedLeafStore {
  private cache: StoredLeaf[] = [];

  private readonly redisMerkleStore: RedisMerkleTreeStore;

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

    if (paths.length > 0) {
      const pathsDecimal = paths.map((path) => new Decimal(path.toString(10)));
      const records = await this.connection.prismaClient.linkedLeaf.findMany({
        where: {
          path: {
            in: pathsDecimal,
          },
          mask: this.mask,
        },
      });

      const stack = records
        .map<StoredLeaf>((record) => {
          return {
            index: BigInt(record.index.toFixed()),
            leaf: {
              path: BigInt(record.path.toFixed()),
              value: BigInt(record.value.toFixed()),
              nextPath: BigInt(record.nextPath.toFixed()),
            },
          };
        })
        .reverse();

      // TODO this runs in O(n^2), find a better matching algorithm for this (ordering?)
      return paths.map((path) => {
        return stack.find((candidate) => candidate.leaf.path === path);
      });
    }
    return [];
  }

  public async getMaximumIndexAsync() {
    this.assertCacheEmpty();

    const result = await this.connection.prismaClient.linkedLeaf.aggregate({
      where: {
        mask: this.mask,
      },
      _max: {
        index: true,
      },
    });
    const maximumIndexString = result._max.index?.toFixed();
    return maximumIndexString !== undefined
      ? BigInt(maximumIndexString)
      : undefined;
  }

  public async getPreviousLeavesAsync(paths: bigint[]) {
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
        RIGHT JOIN (SELECT unnest(ARRAY[${pathsDecimals}]) as query_path) f 
        ON l.path < f.query_path::numeric AND l."nextPath" > f.query_path::numeric
        WHERE l.mask = ${this.mask}
    `;

    const map: Record<string, LinkedLeafQueryResult> = Object.fromEntries(
      result.map((obj) => {
        return [obj.query_path.toFixed(), obj];
      })
    );

    return paths.map((path) => {
      const record = map[path.toString()];
      if (record !== undefined) {
        return {
          index: BigInt(record.index.toFixed()),
          leaf: {
            path: BigInt(record.path.toFixed()),
            value: BigInt(record.value.toFixed()),
            nextPath: BigInt(record.nextPath.toFixed()),
          },
        };
      }
      return undefined;
    });
  }
}
