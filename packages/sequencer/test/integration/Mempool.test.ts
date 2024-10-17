import { log, TypedClass } from "@proto-kit/common";
import { VanillaProtocolModules } from "@proto-kit/library";
import { Runtime } from "@proto-kit/module";
import { MandatoryProtocolModulesRecord, Protocol } from "@proto-kit/protocol";
import { AppChain } from "@proto-kit/sdk";
import { Bool, PrivateKey, UInt64 } from "o1js";
import "reflect-metadata";
import { container } from "tsyringe";

import {
  InMemoryDatabase,
  PrivateMempool,
  Sequencer,
  SequencerModule,
  StorageDependencyFactory,
} from "../../src";
import {
  DefaultTestingSequencerModules,
  testingSequencerFromModules,
} from "../TestingSequencer";

import { Balance } from "./mocks/Balance";
import { createTransaction } from "./utils";

describe.each([["InMemory", InMemoryDatabase]])(
  "Mempool test",
  (
    testName,
    Database: TypedClass<SequencerModule & StorageDependencyFactory>
  ) => {
    let appChain: AppChain<
      { Balance: typeof Balance },
      MandatoryProtocolModulesRecord,
      DefaultTestingSequencerModules & {
        Database: typeof Database;
      },
      {}
    >;
    let sequencer: Sequencer<
      DefaultTestingSequencerModules & { Database: typeof Database }
    >;
    let runtime: Runtime<{ Balance: typeof Balance }>;
    let mempool: PrivateMempool;

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

    beforeEach(async () => {
      log.setLevel(log.levels.INFO);

      const runtimeClass = Runtime.from({
        modules: {
          Balance,
        },

        config: {
          Balance: {},
        },
      });

      const sequencerClass = testingSequencerFromModules({});

      const protocolClass = Protocol.from({
        modules: VanillaProtocolModules.mandatoryModules({}),
      });

      appChain = AppChain.from({
        Sequencer: sequencerClass,
        Runtime: runtimeClass,
        Protocol: protocolClass,
        modules: {},
      });

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
          LocalTaskWorkerModule: {},
          BaseLayer: {},
          TaskQueue: {},
          ProtocolStartupModule: {},
        },
        Protocol: {
          AccountState: {},
          BlockProver: {},
          StateTransitionProver: {},
          BlockHeight: {},
          LastStateRoot: {},
        },
      });

      // Start AppChain
      await appChain.start(container.createChildContainer());

      runtime = appChain.runtime;
      sequencer = appChain.sequencer;

      mempool = sequencer.resolve("Mempool");
    });

    it("transactions are returned in right order - simple", async () => {
      expect.assertions(13);

      await mempoolAddTransactions(user1PrivateKey, 0);
      await mempoolAddTransactions(user2PrivateKey, 0);
      await mempoolAddTransactions(user3PrivateKey, 0);
      await mempoolAddTransactions(user1PrivateKey, 1);
      await mempoolAddTransactions(user2PrivateKey, 1);
      await mempoolAddTransactions(user3PrivateKey, 1);

      const txs = await mempool.getTxs();

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
      expect.assertions(13);

      log.setLevel("TRACE");

      await mempoolAddTransactions(user1PrivateKey, 0);
      await mempoolAddTransactions(user2PrivateKey, 0);
      await mempoolAddTransactions(user3PrivateKey, 1);
      await mempoolAddTransactions(user1PrivateKey, 1);
      await mempoolAddTransactions(user2PrivateKey, 1);
      await mempoolAddTransactions(user3PrivateKey, 0);

      const txs = await mempool.getTxs();

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
      expect.assertions(13);

      await mempoolAddTransactions(user1PrivateKey, 0);
      await mempoolAddTransactions(user2PrivateKey, 1);
      await mempoolAddTransactions(user3PrivateKey, 1);
      await mempoolAddTransactions(user2PrivateKey, 0);
      await mempoolAddTransactions(user3PrivateKey, 0);
      await mempoolAddTransactions(user1PrivateKey, 1);

      const txs = await mempool.getTxs();

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
      expect.assertions(13);

      await mempoolAddTransactions(user1PrivateKey, 0);
      await mempoolAddTransactions(user1PrivateKey, 4);
      await mempoolAddTransactions(user1PrivateKey, 5);
      await mempoolAddTransactions(user2PrivateKey, 1);
      await mempoolAddTransactions(user3PrivateKey, 1);
      await mempoolAddTransactions(user2PrivateKey, 0);
      await mempoolAddTransactions(user3PrivateKey, 0);
      await mempoolAddTransactions(user1PrivateKey, 1);

      const txs = await mempool.getTxs();

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
  }
);
