import "reflect-metadata";
import { expect } from "@jest/globals";
import { VanillaProtocolModules } from "@proto-kit/library";
import { MandatoryProtocolModulesRecord, Protocol } from "@proto-kit/protocol";
import { Runtime } from "@proto-kit/module";
import { AppChain } from "@proto-kit/sdk";
import { Bool, Field, PrivateKey, UInt64 } from "o1js";
import { TypedClass, expectDefined } from "@proto-kit/common";

import {
  AsyncStateService,
  BlockStorage,
  HistoricalBlockStorage,
  HistoricalUnprovenBlockStorage,
  InMemoryDatabase,
  Sequencer,
  SequencerModule,
  StateEntry,
  StateRecord,
  StorageDependencyFactory,
  UnprovenBlockStorage,
} from "../../src";
import {
  DefaultTestingSequencerModules,
  testingSequencerFromModules,
} from "../TestingSequencer";

import { collectStateDiff, createTransaction } from "./utils";
import { Balance } from "./mocks/Balance";

function checkStateDiffEquality(stateDiff: StateRecord, state: StateEntry[]) {
  return Object.entries(stateDiff)
    .map(([key, value]) => {
      const entry = state.find((s) => s.key.toString() === key);
      if (entry !== undefined) {
        if (entry.value === undefined) {
          return value === undefined;
        }
        if (value !== undefined) {
          return entry.value.find((v, i) => v !== value[i]) === undefined;
        }
      }
      return false;
    })
    .reduce((acc, v) => acc && v, true);
}

describe.each([["InMemory", InMemoryDatabase]])(
  "Storage Adapter Test %s",
  (
    testName,
    Database: TypedClass<SequencerModule & StorageDependencyFactory>
  ) => {
    let appChain: AppChain<
      { Balance: typeof Balance },
      MandatoryProtocolModulesRecord,
      DefaultTestingSequencerModules & { Database: typeof Database },
      {}
    >;
    let sequencer: Sequencer<
      DefaultTestingSequencerModules & { Database: typeof Database }
    >;
    let runtime: Runtime<{ Balance: typeof Balance }>;

    let unprovenState: AsyncStateService;
    let provenState: AsyncStateService;

    // let unprovenTreeStore: AsyncMerkleTreeStore;
    // let provenTreeStore: AsyncMerkleTreeStore;

    const sk = PrivateKey.random();
    const pk = sk.toPublicKey();
    let pkNonce = 0;

    beforeAll(async () => {
      const sequencerClass = testingSequencerFromModules({
        Database,
      });

      const runtimeClass = Runtime.from({
        modules: {
          Balance,
        },
      });

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
          BlockProducerModule: {},
          UnprovenProducerModule: {},
          LocalTaskWorkerModule: {},
          BaseLayer: {},
          TaskQueue: {},
        },
        Protocol: {
          AccountState: {},
          BlockProver: {},
          StateTransitionProver: {},
          BlockHeight: {},
          LastStateRoot: {},
        },
      });

      await appChain.start();

      runtime = appChain.runtime;
      sequencer = appChain.sequencer;

      unprovenState = sequencer.resolve("UnprovenStateService");
      provenState = sequencer.resolve("AsyncStateService");
    });

    it("test unproven block prod", async () => {
      await appChain.sequencer.resolve("Mempool").add(
        createTransaction({
          runtime,
          method: ["Balance", "setBalanceIf"],
          privateKey: sk,
          args: [pk, UInt64.from(100), Bool(true)],
          nonce: pkNonce++,
        })
      );

      const generatedBlock = await sequencer
        .resolve("BlockTrigger")
        .produceUnproven(true);

      expectDefined(generatedBlock);

      const blocks = await sequencer
        .resolve("UnprovenBlockQueue")
        .getNewBlocks();

      expect(blocks).toHaveLength(1);

      const { lastBlockMetadata, block } = blocks[0];

      expect(lastBlockMetadata).toBeUndefined();
      expect(block.block.hash.toBigInt()).toStrictEqual(
        generatedBlock.hash.toBigInt()
      );

      const blockStorage = sequencer.resolve(
        "UnprovenBlockStorage"
      ) as HistoricalUnprovenBlockStorage & UnprovenBlockStorage;
      const block2 = await blockStorage.getBlockAt(
        Number(blocks[0].block.block.height.toString())
      );

      expectDefined(block2);
      expect(block2.hash.toBigInt()).toStrictEqual(
        generatedBlock.hash.toBigInt()
      );

      const stateDiff = collectStateDiff(
        block.block.transactions.flatMap((tx) =>
          tx.stateTransitions.concat(tx.protocolTransitions)
        )
      );

      const state = await unprovenState.getAsync(
        Object.keys(stateDiff).map(Field)
      );

      expect(checkStateDiffEquality(stateDiff, state)).toBe(true);
      expect(state.length).toBeGreaterThanOrEqual(1);

      await expect(
        provenState.getSingleAsync(state[0].key)
      ).resolves.toBeUndefined();
    });

    it("test proven block prod", async () => {
      const generatedBatch = await sequencer
        .resolve("BlockTrigger")
        .produceProven();

      expectDefined(generatedBatch);

      const blocks = await sequencer
        .resolve("UnprovenBlockQueue")
        .getNewBlocks();
      expect(blocks).toHaveLength(0);

      const batchStorage = sequencer.resolve(
        "BlockStorage"
      ) as HistoricalBlockStorage & BlockStorage;
      const batch = await batchStorage.getBlockAt(0);

      expectDefined(batch);
      expect(batch.height).toStrictEqual(generatedBatch?.height);

      await expect(batchStorage.getCurrentBlockHeight()).resolves.toStrictEqual(
        1
      );
    }, 50_000);

    it("mempool + transaction storage", async () => {
      const mempool = sequencer.resolve("Mempool");
      const txStorage = sequencer.resolve("TransactionStorage");

      const tx = createTransaction({
        runtime,
        method: ["Balance", "setBalanceIf"],
        privateKey: sk,
        args: [pk, UInt64.from(100), Bool(true)],
        nonce: pkNonce++,
      });
      await mempool.add(tx);

      const txs = await txStorage.getPendingUserTransactions();

      expect(txs).toHaveLength(1);
      expect(txs[0].hash().toString()).toStrictEqual(tx.hash().toString());

      await sequencer.resolve("BlockTrigger").produceUnproven();

      await expect(
        txStorage.getPendingUserTransactions()
      ).resolves.toHaveLength(0);
    }, 30_000);
  }
);
