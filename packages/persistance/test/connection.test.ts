import "reflect-metadata";
import { describe } from "@jest/globals";
import { Field } from "o1js";
import { CachedMerkleTreeStore } from "@proto-kit/sequencer";
import { expectDefined, RollupMerkleTree } from "@proto-kit/common";

import {
  RedisConnectionModule,
  PrismaDatabaseConnection,
  PrismaStateService,
  RedisMerkleTreeStore,
} from "../src";

// TODO Pull apart and test properly
// Needs redis instance
describe.skip("prisma", () => {
  it("merkle store", async () => {
    const db = new RedisConnectionModule();
    db.config = {
      host: "localhost",
      port: 6379,
      password: "password",
    };
    await db.start();
    const store = new RedisMerkleTreeStore(db);

    const cached = new CachedMerkleTreeStore(store);
    const tree = new RollupMerkleTree(cached);

    await cached.preloadKey(100n);
    await cached.preloadKey(500n);

    tree.setLeaf(100n, Field(6));
    await cached.mergeIntoParent();

    tree.setLeaf(500n, Field(100));
    await cached.mergeIntoParent();

    console.log(`Root ${tree.getRoot().toBigInt()}`);

    const store2 = new RedisMerkleTreeStore(db);

    const cached2 = new CachedMerkleTreeStore(store2);
    const tree2 = new RollupMerkleTree(cached2);

    await cached2.preloadKey(103n);

    expect(tree2.getRoot().toBigInt()).toStrictEqual(tree.getRoot().toBigInt());

    await cached2.preloadKey(100n);
    const witness = tree2.getWitness(100n);

    const witnessRoot = witness.calculateRoot(Field(6));
    expect(witnessRoot.toBigInt()).toStrictEqual(tree.getRoot().toBigInt());

    await db.redisClient.disconnect();
  });

  it("fill and get", async () => {
    const db = new PrismaDatabaseConnection();
    db.config = {};
    await db.start();
    const service = new PrismaStateService(db, "testMask");

    await service.openTransaction();
    service.writeStates([
      {
        key: Field(5),
        value: [Field(100)],
      },
    ]);
    await service.commit();

    const result = await service.getSingleAsync(Field(5));
    console.log(`Received ${result?.map((x) => x.toString())}`);

    expectDefined(result);

    expect(result[0].toBigInt()).toBe(100n);

    await service.openTransaction();
    service.writeStates([
      {
        key: Field(5),
        value: undefined,
      },
    ]);
    await service.commit();

    const result2 = await service.getSingleAsync(Field(5));
    expect(result2).toBeUndefined();

    await db.prismaClient.$disconnect();
  });
});

describe("placeholder", () => {
  it("placeholder", () => {
    expect(1).toBe(1);
  });
});
