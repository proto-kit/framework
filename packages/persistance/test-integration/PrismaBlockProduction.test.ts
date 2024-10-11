import "reflect-metadata";
import { afterAll, beforeAll, describe, expect } from "@jest/globals";
import { expectDefined } from "@proto-kit/common";
import { BalancesKey, TokenId } from "@proto-kit/library";
import { NetworkState } from "@proto-kit/protocol";
import { AppChainTransaction } from "@proto-kit/sdk";
import { Block, Batch } from "@proto-kit/sequencer";
import { PrivateKey, PublicKey } from "o1js";
import { container } from "tsyringe";

import {
  PrismaBatchStore,
  PrismaBlockStorage,
  PrismaTransactionStorage,
} from "../src";

import {
  createPrismaAppchain,
  IntegrationTestDBConfig,
  prepareBlock,
} from "./utils";

describe("prisma integration", () => {
  let appChain: ReturnType<typeof createPrismaAppchain>;

  const sender = PrivateKey.random();
  let senderNonce = 0;

  const setup = async () => {
    const { prismaConfig, redisConfig } = IntegrationTestDBConfig;
    appChain = createPrismaAppchain(prismaConfig, redisConfig);

    appChain.configurePartial({
      Signer: {
        signer: sender,
      },
    });

    await appChain.start(container.createChildContainer());

    const db = appChain.sequencer.resolve("Database");
    await db.prisma.pruneDatabase();
    await db.redis.pruneDatabase();

    senderNonce = 0;
  };

  const teardown = async () => {
    await appChain.sequencer.resolve("Database").close();
  };

  describe("produce fuzzed block", () => {
    let block: Block | undefined;
    let batch: Batch | undefined;

    beforeAll(async () => {
      await setup();

      await prepareBlock(appChain, sender.toPublicKey(), senderNonce);
      senderNonce++;

      [block, batch] = await appChain.sequencer
        .resolve("BlockTrigger")
        .produceBlockAndBatch();
    }, 30000);

    afterAll(async () => {
      await teardown();
    });

    it("should have produced a block and batch", () => {
      expectDefined(block);
      expectDefined(batch);
    });

    it("should save and retrieve the same block", async () => {
      expectDefined(block);

      // Check equality of block
      const blockStorage = await appChain.sequencer.resolveOrFail(
        "BlockStorage",
        PrismaBlockStorage
      );
      const retrievedBlock = await blockStorage.getBlockAt(0);
      expectDefined(retrievedBlock);

      // Check that transactions match
      expect(retrievedBlock.transactions).toHaveLength(1);
      expect(retrievedBlock.transactions[0].tx.hash().toString()).toStrictEqual(
        block.transactions[0].tx.hash().toString()
      );

      expect(retrievedBlock.hash.toString()).toStrictEqual(
        block.hash.toString()
      );

      // Check that events match
      expect(retrievedBlock.transactions[0].events).toHaveLength(1);
      expect(retrievedBlock.transactions[0].events).toStrictEqual(
        block.transactions[0].events
      );

      expect(
        NetworkState.toFields(retrievedBlock.networkState.before).map((x) =>
          x.toString()
        )
      ).toStrictEqual(
        NetworkState.toFields(block.networkState.before).map((x) =>
          x.toString()
        )
      );
      expect(
        NetworkState.toFields(retrievedBlock.networkState.during).map((x) =>
          x.toString()
        )
      ).toStrictEqual(
        NetworkState.toFields(block.networkState.during).map((x) =>
          x.toString()
        )
      );
    });

    it("should save and retrieve the same batch", async () => {
      expectDefined(batch);

      // Check equality of batch
      const batchStorage = await appChain.sequencer.resolveOrFail(
        "BatchStorage",
        PrismaBatchStore
      );
      const retrievedBatch = await batchStorage.getBatchAt(0);
      expectDefined(retrievedBatch);

      expect(retrievedBatch.height).toStrictEqual(batch.height);
      expect(retrievedBatch.blockHashes).toHaveLength(
        retrievedBatch.blockHashes.length
      );
      expect(retrievedBatch.blockHashes).toStrictEqual(
        retrievedBatch.blockHashes
      );
    });

    it("should query fetches correct nonce", async () => {
      const accountState =
        await appChain.query.protocol.AccountState.accountState.get(
          sender.toPublicKey()
        );

      expectDefined(accountState);

      expect(accountState.nonce.toString()).toBe("1");
    });

    it("should query fetches undefined for unset account", async () => {
      const accountState =
        await appChain.query.protocol.AccountState.accountState.get(
          PublicKey.empty<typeof PublicKey>()
        );

      expect(accountState).toBeUndefined();
    });

    it("should fetch balance change", async () => {
      const balance = await appChain.query.runtime.Balances.balances.get(
        BalancesKey.from(TokenId.from(0), sender.toPublicKey())
      );

      expectDefined(balance);

      expect(balance.toString()).toStrictEqual("100");
    });

    describe.skip("add balance to second account", () => {
      const sender2 = PrivateKey.random();

      beforeAll(async () => {
        appChain.configurePartial({
          Signer: {
            signer: sender2,
          },
        });
        await prepareBlock(appChain, sender2.toPublicKey(), 0);
      });

      it("should produce the block", async () => {
        const [block2, batch2] = await appChain.sequencer
          .resolve("BlockTrigger")
          .produceBlockAndBatch();

        expectDefined(block2);
        expectDefined(batch2);
        expect(block2.transactions).toHaveLength(1);
      }, 30000);

      it("should retrieve correct balance for account 2", async () => {
        const balance = await appChain.query.runtime.Balances.balances.get(
          BalancesKey.from(TokenId.from(0), sender2.toPublicKey())
        );

        expectDefined(balance);

        expect(balance.toString()).toStrictEqual("100");
      });
    });
  });

  describe("persisted mempool", () => {
    let transaction: AppChainTransaction;

    beforeAll(async () => {
      await setup();

      transaction = await prepareBlock(
        appChain,
        sender.toPublicKey(),
        senderNonce
      );
      senderNonce++;
    });

    afterAll(async () => {
      await teardown();
    });

    it("mempool should give 1 transaction", async () => {
      const mempool = appChain.sequencer.resolve("Mempool");
      const txs = await mempool.getTxs();

      expectDefined(transaction.transaction);

      expect(txs).toHaveLength(1);
      expect(txs[0].hash().toString()).toStrictEqual(
        transaction.transaction.hash().toString()
      );
    });

    it("should resolve transaction from storage as pending", async () => {
      const txResolver = appChain.sequencer.resolveOrFail(
        "TransactionStorage",
        PrismaTransactionStorage
      );

      const txs = await txResolver.getPendingUserTransactions();

      expectDefined(transaction.transaction);

      expect(txs).toHaveLength(1);
      expect(txs[0].hash().toString()).toStrictEqual(
        transaction.transaction.hash().toString()
      );
    });
  });
});
