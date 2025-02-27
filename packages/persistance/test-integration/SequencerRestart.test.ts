import "reflect-metadata";
import { afterAll, beforeAll, expect } from "@jest/globals";
import { expectDefined, log } from "@proto-kit/common";
import { PrivateKey } from "o1js";
import { container } from "tsyringe";

import {
  createPrismaAppchain,
  IntegrationTestDBConfig,
  prepareBlock,
} from "./utils";

describe("sequencer restart", () => {
  let appChain: ReturnType<typeof createPrismaAppchain>;

  const sender = PrivateKey.random();
  let senderNonce = 0;

  const clearDB = async () => {
    const db = appChain.sequencer.resolve("Database");
    await db.prisma.pruneDatabase();
    await db.redis.pruneDatabase();
  };

  const setup = async () => {
    const { prismaConfig, redisConfig } = IntegrationTestDBConfig;
    appChain = createPrismaAppchain(prismaConfig, redisConfig);

    appChain.configurePartial({
      Signer: {
        signer: sender,
      },
    });

    await appChain.start(false, container.createChildContainer());
  };

  const teardown = async () => {
    await appChain.sequencer.resolve("Database").close();
  };

  const produce = async (num: number, type: "block" | "batch") => {
    const blockTrigger = appChain.sequencer.resolve("BlockTrigger");

    for (let block = 0; block < num; block++) {
      await prepareBlock(appChain, sender.toPublicKey(), senderNonce);
      senderNonce++;

      const producedBlock = await blockTrigger.produceBlock();
      if ((producedBlock?.transactions.length ?? 0) === 0) {
        throw new Error(`Block not produced correctly: ${block}`);
      }
      if (type === "batch") {
        await blockTrigger.produceBatch();
      }
    }
  };

  describe("resume at latest block", () => {
    beforeAll(async () => {
      await setup();
      await clearDB();

      await produce(2, "batch");

      await teardown();

      await setup();
    }, 40000);

    afterAll(async () => {
      await teardown();
    });

    it("should fetch correct nonce", async () => {
      const accountState =
        await appChain.query.protocol.AccountState.accountState.get(
          sender.toPublicKey()
        );

      expectDefined(accountState);

      expect(accountState.nonce.toString()).toBe("2");
    });

    it("should be able to produce a block on top", async () => {
      const blockTrigger = appChain.sequencer.resolve("BlockTrigger");
      await prepareBlock(appChain, sender.toPublicKey(), senderNonce);
      senderNonce++;

      const [block, batch] = await blockTrigger.produceBlockAndBatch();

      expectDefined(block);
      expectDefined(batch);

      expect(block.transactions).toHaveLength(1);
      expect(block.transactions[0].tx.nonce.toString()).toBe("2");
    }, 15000);
  });

  describe("reconstruct untraced block masks", () => {
    beforeEach(async () => {
      log.setLevel("DEBUG");

      await setup();
      await clearDB();

      await produce(2, "block");

      await teardown();

      await setup();

      console.log("beforeEach");
    }, 40000);

    afterEach(async () => {
      await teardown();
    });

    it("should be able to produce a block on top", async () => {
      const blockTrigger = appChain.sequencer.resolve("BlockTrigger");
      await prepareBlock(appChain, sender.toPublicKey(), senderNonce);
      senderNonce++;

      const block = await blockTrigger.produceBlock();

      expectDefined(block);

      expect(block.transactions).toHaveLength(1);
      expect(block.transactions[0].tx.nonce.toString()).toBe("2");

      // Should be able to trace after additional block
      const batch = await blockTrigger.produceBatch();

      expectDefined(batch);
      expect(batch.blockHashes).toHaveLength(3);
    }, 15000);

    it("should be able to trace", async () => {
      const blockTrigger = appChain.sequencer.resolve("BlockTrigger");
      const batch = await blockTrigger.produceBatch();

      expectDefined(batch);
      expect(batch.blockHashes).toHaveLength(2);
    });
  });
});
