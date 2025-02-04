import "reflect-metadata";
import { afterAll, beforeAll, expect } from "@jest/globals";
import { expectDefined } from "@proto-kit/common";
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

  beforeAll(async () => {
    await setup();
    await clearDB();

    const blockTrigger = appChain.sequencer.resolve("BlockTrigger");

    console.log(sender.toPublicKey().toBase58());

    for (let block = 0; block < 2; block++) {
      await prepareBlock(appChain, sender.toPublicKey(), senderNonce);
      senderNonce++;

      const [producedBlock] = await blockTrigger.produceBlockAndBatch();
      if ((producedBlock?.transactions.length ?? 0) === 0) {
        throw new Error(`Block not produced correctly: ${block}`);
      }
    }

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
    console.log("2");

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
