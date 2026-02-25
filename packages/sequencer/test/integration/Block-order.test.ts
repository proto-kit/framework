import { expectDefined, log, TypedClass } from "@proto-kit/common";
import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
import { Bool, PrivateKey, UInt64 } from "o1js";
import "reflect-metadata";
import { container } from "tsyringe";
import { afterEach, expect, jest } from "@jest/globals";

import {
  InMemoryDatabase,
  PrivateMempool,
  Sequencer,
  SequencerModule,
  DatabaseDependencyFactory,
  VanillaTaskWorkerModules,
  AppChain,
  ManualBlockTrigger,
} from "../../src";
import {
  DefaultTestingSequencerModules,
  testingSequencerModules,
} from "../TestingSequencer";

import { Balance } from "./mocks/Balance";
import { createTransaction } from "./utils";

describe.each([["InMemory", InMemoryDatabase]])(
  "Block Ordering test: %s",
  (
    testName,
    Database: TypedClass<SequencerModule<unknown>> &
      DatabaseDependencyFactory<any>
  ) => {
    let appChain: ReturnType<typeof createAppChain>;
    let sequencer: Sequencer<
      DefaultTestingSequencerModules & {
        Database: typeof Database;
      }
    >;
    let runtime: Runtime<{ Balance: typeof Balance }>;
    let mempool: PrivateMempool;
    let trigger: ManualBlockTrigger;

    async function mempoolAddTransactions(
      userPrivateKey: PrivateKey,
      nonce: number
    ) {
      return await mempool.add(
        createTransaction({
          runtime,
          method: ["Balance", "setBalanceIf"],
          privateKey: userPrivateKey,
          args: [userPrivateKey.toPublicKey(), UInt64.from(100), Bool(true)],
          nonce: nonce,
        })
      );
    }

    const user1PrivateKey = PrivateKey.fromBase58(
      "EKECjie2xJey56tTqwZbMh7NuQffpA4G9LkZkCBBm3nmwYkAzBUz"
    );
    const user1PublicKey = user1PrivateKey.toPublicKey();

    const user2PrivateKey = PrivateKey.fromBase58(
      "EKEiWucbahaja6beCxVY72ayknTWWwT6WQHHun9bZdkcdboAA8yS"
    );
    const user2PublicKey = user2PrivateKey.toPublicKey();

    const user3PrivateKey = PrivateKey.fromBase58(
      "EKDvi75A2GN1vBN5Tyxfzf1H7rHRvn7abKCTBzz6Vcv6LjbMWEvJ"
    );
    const user3PublicKey = user3PrivateKey.toPublicKey();

    function createAppChain() {
      const runtimeClass = Runtime.from({
        Balance,
      });

      const sequencerClass = Sequencer.from(testingSequencerModules({}));

      const protocolClass = Protocol.from(Protocol.defaultModules());

      return AppChain.from({
        Sequencer: sequencerClass,
        Runtime: runtimeClass,
        Protocol: protocolClass,
      });
    }

    beforeEach(async () => {
      log.setLevel(log.levels.INFO);

      appChain = createAppChain();

      appChain.configure({
        Runtime: {
          Balance: {},
        },
        Sequencer: {
          Database: {},
          BlockTrigger: {},
          Mempool: {},
          FeeStrategy: {},
          BatchProducerModule: {},
          BlockProducerModule: {},
          LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
          BaseLayer: {},
          TaskQueue: {},
          SequencerStartupModule: {},
        },
        Protocol: Protocol.defaultConfig(),
      });

      // Start AppChain
      await appChain.start(false, container.createChildContainer());

      runtime = appChain.runtime;
      sequencer = appChain.sequencer;

      mempool = sequencer.resolve("Mempool");
      trigger = sequencer.resolve("BlockTrigger");
    });

    afterEach(async () => {
      await appChain.close();

      jest.restoreAllMocks();
    });

    it("transactions are returned in right order - simple", async () => {
      expect.assertions(14);

      await mempoolAddTransactions(user1PrivateKey, 0);
      await mempoolAddTransactions(user2PrivateKey, 0);
      await mempoolAddTransactions(user3PrivateKey, 0);
      await mempoolAddTransactions(user1PrivateKey, 1);
      await mempoolAddTransactions(user2PrivateKey, 1);
      await mempoolAddTransactions(user3PrivateKey, 1);

      const block = await trigger.produceBlock();
      expectDefined(block);
      const txs = block.transactions.map((x) => x.tx);

      expect(txs).toHaveLength(6);
      expect(txs[0].nonce.toBigInt()).toStrictEqual(0n);
      expect(txs[0].sender).toStrictEqual(user1PublicKey);
      expect(txs[1].nonce.toBigInt()).toStrictEqual(0n);
      expect(txs[1].sender).toStrictEqual(user2PublicKey);
      expect(txs[2].nonce.toBigInt()).toStrictEqual(0n);
      expect(txs[2].sender).toStrictEqual(user3PublicKey);
      expect(txs[3].nonce.toBigInt()).toStrictEqual(1n);
      expect(txs[3].sender).toStrictEqual(user1PublicKey);
      expect(txs[4].nonce.toBigInt()).toStrictEqual(1n);
      expect(txs[4].sender).toStrictEqual(user2PublicKey);
      expect(txs[5].nonce.toBigInt()).toStrictEqual(1n);
      expect(txs[5].sender).toStrictEqual(user3PublicKey);
    });

    it("transactions are returned in right order - medium", async () => {
      expect.assertions(14);

      log.setLevel("TRACE");

      await mempoolAddTransactions(user1PrivateKey, 0);
      await mempoolAddTransactions(user2PrivateKey, 0);
      await mempoolAddTransactions(user3PrivateKey, 1);
      await mempoolAddTransactions(user1PrivateKey, 1);
      await mempoolAddTransactions(user2PrivateKey, 1);
      await mempoolAddTransactions(user3PrivateKey, 0);

      const block = await trigger.produceBlock();
      expectDefined(block);
      const txs = block.transactions.map((x) => x.tx);

      expect(txs).toHaveLength(6);
      expect(txs[0].nonce.toBigInt()).toStrictEqual(0n);
      expect(txs[0].sender).toStrictEqual(user1PublicKey);
      expect(txs[1].nonce.toBigInt()).toStrictEqual(0n);
      expect(txs[1].sender).toStrictEqual(user2PublicKey);
      expect(txs[2].nonce.toBigInt()).toStrictEqual(1n);
      expect(txs[2].sender).toStrictEqual(user1PublicKey);
      expect(txs[3].nonce.toBigInt()).toStrictEqual(1n);
      expect(txs[3].sender).toStrictEqual(user2PublicKey);
      expect(txs[4].nonce.toBigInt()).toStrictEqual(0n);
      expect(txs[4].sender).toStrictEqual(user3PublicKey);
      expect(txs[5].nonce.toBigInt()).toStrictEqual(1n);
      expect(txs[5].sender).toStrictEqual(user3PublicKey);
    });

    it("transactions are returned in right order - harder", async () => {
      expect.assertions(14);

      await mempoolAddTransactions(user1PrivateKey, 0);
      await mempoolAddTransactions(user2PrivateKey, 1);
      await mempoolAddTransactions(user3PrivateKey, 1);
      await mempoolAddTransactions(user2PrivateKey, 0);
      await mempoolAddTransactions(user3PrivateKey, 0);
      await mempoolAddTransactions(user1PrivateKey, 1);

      const block = await trigger.produceBlock();
      expectDefined(block);
      const txs = block.transactions.map((x) => x.tx);

      expect(txs).toHaveLength(6);
      expect(txs[0].nonce.toBigInt()).toStrictEqual(0n);
      expect(txs[0].sender).toStrictEqual(user1PublicKey);
      expect(txs[1].nonce.toBigInt()).toStrictEqual(0n);
      expect(txs[1].sender).toStrictEqual(user2PublicKey);
      expect(txs[2].nonce.toBigInt()).toStrictEqual(0n);
      expect(txs[2].sender).toStrictEqual(user3PublicKey);
      expect(txs[3].nonce.toBigInt()).toStrictEqual(1n);
      expect(txs[3].sender).toStrictEqual(user1PublicKey);
      expect(txs[4].nonce.toBigInt()).toStrictEqual(1n);
      expect(txs[4].sender).toStrictEqual(user2PublicKey);
      expect(txs[5].nonce.toBigInt()).toStrictEqual(1n);
      expect(txs[5].sender).toStrictEqual(user3PublicKey);
    });

    it("transactions are returned in right order - hardest", async () => {
      expect.assertions(14);

      await mempoolAddTransactions(user1PrivateKey, 0);
      await mempoolAddTransactions(user1PrivateKey, 4);
      await mempoolAddTransactions(user1PrivateKey, 5);
      await mempoolAddTransactions(user2PrivateKey, 1);
      await mempoolAddTransactions(user3PrivateKey, 1);
      await mempoolAddTransactions(user2PrivateKey, 0);
      await mempoolAddTransactions(user3PrivateKey, 0);
      await mempoolAddTransactions(user1PrivateKey, 1);

      const block = await trigger.produceBlock();
      expectDefined(block);
      const txs = block.transactions.map((x) => x.tx);

      expect(txs).toHaveLength(6);
      expect(txs[0].nonce.toBigInt()).toStrictEqual(0n);
      expect(txs[0].sender).toStrictEqual(user1PublicKey);
      expect(txs[1].nonce.toBigInt()).toStrictEqual(0n);
      expect(txs[1].sender).toStrictEqual(user2PublicKey);
      expect(txs[2].nonce.toBigInt()).toStrictEqual(0n);
      expect(txs[2].sender).toStrictEqual(user3PublicKey);
      expect(txs[3].nonce.toBigInt()).toStrictEqual(1n);
      expect(txs[3].sender).toStrictEqual(user1PublicKey);
      expect(txs[4].nonce.toBigInt()).toStrictEqual(1n);
      expect(txs[4].sender).toStrictEqual(user2PublicKey);
      expect(txs[5].nonce.toBigInt()).toStrictEqual(1n);
      expect(txs[5].sender).toStrictEqual(user3PublicKey);
    });

    it("transactions are returned in right order in multiple distinct blocks - hardest", async () => {
      expect.assertions(18);

      sequencer.resolve("BlockProducerModule").config.maximumBlockSize = 3;
      const txStorage = sequencer.resolve("TransactionStorage");
      const getTxsSpy = jest.spyOn(txStorage, "getPendingUserTransactions");

      await mempoolAddTransactions(user1PrivateKey, 0);
      await mempoolAddTransactions(user1PrivateKey, 4);
      await mempoolAddTransactions(user1PrivateKey, 5);
      await mempoolAddTransactions(user2PrivateKey, 1);
      await mempoolAddTransactions(user3PrivateKey, 1);
      await mempoolAddTransactions(user2PrivateKey, 0);
      await mempoolAddTransactions(user3PrivateKey, 0);
      await mempoolAddTransactions(user1PrivateKey, 1);

      let block = await trigger.produceBlock();
      expectDefined(block);

      let txs = block.transactions.map((x) => x.tx);
      expect(txs).toHaveLength(3);

      expect(txs[0].nonce.toBigInt()).toStrictEqual(0n);
      expect(txs[0].sender).toStrictEqual(user1PublicKey);
      expect(txs[1].nonce.toBigInt()).toStrictEqual(0n);
      expect(txs[1].sender).toStrictEqual(user2PublicKey);
      expect(txs[2].nonce.toBigInt()).toStrictEqual(0n);
      expect(txs[2].sender).toStrictEqual(user3PublicKey);

      expect(getTxsSpy).toHaveBeenCalledTimes(3);

      block = await trigger.produceBlock();
      expectDefined(block);

      txs = block.transactions.map((x) => x.tx);
      expect(txs).toHaveLength(3);

      expect(txs[0].nonce.toBigInt()).toStrictEqual(1n);
      expect(txs[0].sender).toStrictEqual(user2PublicKey);
      expect(txs[1].nonce.toBigInt()).toStrictEqual(1n);
      expect(txs[1].sender).toStrictEqual(user3PublicKey);
      expect(txs[2].nonce.toBigInt()).toStrictEqual(1n);
      expect(txs[2].sender).toStrictEqual(user1PublicKey);

      expect(getTxsSpy).toHaveBeenCalledTimes(4);
    });
  }
);
