import { describe } from "@jest/globals";
import { PrismaDatabaseConnection } from "../src/PrismaDatabaseConnection";
import { PrismaStateService } from "../src/services/prisma/PrismaStateService";
import { Field } from "o1js";
import { PrismaMerkleTreeStore } from "../src";
import { CachedMerkleTreeStore } from "@proto-kit/sequencer";
import { RollupMerkleTree } from "@proto-kit/protocol";
import { RedisConnection } from "../src/RedisConnection";
import { RedisMerkleTreeStore } from "../src/services/redis/RedisMerkleTreeStore";

describe("prisma", () => {
  it("merkle store", async () => {
    const db = new RedisConnection();
    db.config = {
      url: "redis://localhost:6379/",
      password: "password",
    }
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

    await db.client!.disconnect();
  });

  it.skip("merkle store", async () => {
    const db = new PrismaDatabaseConnection();
    const store = new PrismaMerkleTreeStore(db);

    const cached = new CachedMerkleTreeStore(store);
    const tree = new RollupMerkleTree(cached);

    tree.setLeaf(10n, Field(6));
    await cached.mergeIntoParent();

    // store.writeNodes([{ key: 1n, level: 0, value: 15n }]);
    // store.writeNodes([{ key: 2n, level: 0, value: 2n ** 244n }]);
    // await store.commit();
  });

  it.skip("fill and get", async () => {
    const db = new PrismaDatabaseConnection();
    const service = new PrismaStateService(db);

    await service.setAsync(Field(5), [Field(100)]);
    await service.commit();

    const result = await service.getAsync(Field(5));
    console.log(`Received ${result?.map((x) => x.toString())}`);

    expect(result).toBeDefined();
    expect(result![0].toBigInt()).toBe(100n);

    await service.setAsync(Field(5), undefined);
    await service.commit();

    const result2 = await service.getAsync(Field(5));
    expect(result2).toBeUndefined();

    await db.client.$disconnect();
  });
});
