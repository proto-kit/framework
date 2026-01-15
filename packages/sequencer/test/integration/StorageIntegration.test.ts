import "reflect-metadata";
import { expect } from "@jest/globals";
import { Protocol } from "@proto-kit/protocol";
import { Runtime } from "@proto-kit/module";
import { Bool, Field, PrivateKey, UInt64 } from "o1js";
import { TypedClass, expectDefined } from "@proto-kit/common";

import {
  AsyncStateService,
  BatchStorage,
  InMemoryDatabase,
  Sequencer,
  SequencerModule,
  StateEntry,
  StateRecord,
  StorageDependencyFactory,
  BlockStorage,
  VanillaTaskWorkerModules,
  AppChain,
  UntypedStateTransition,
} from "../../src";
import {
  DefaultTestingSequencerModules,
  testingSequencerModules,
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
          return (
            entry.value.find((v, i) => !v.equals(value[i]).toBoolean()) ===
            undefined
          );
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
    let appChain: ReturnType<typeof createAppChain>;
    let sequencer: Sequencer<
      DefaultTestingSequencerModules & { Database: typeof Database }
    >;
    let runtime: Runtime<{ Balance: typeof Balance }>;

    let unprovenState: AsyncStateService;
    let provenState: AsyncStateService;

    const sk = PrivateKey.random();
    const pk = sk.toPublicKey();
    let pkNonce = 0;

    function createAppChain() {
      const sequencerClass = Sequencer.from(
        testingSequencerModules({
          Database,
        })
      );

      const runtimeClass = Runtime.from({
        Balance,
      });

      const protocolClass = Protocol.from(Protocol.defaultModules());

      return AppChain.from({
        Sequencer: sequencerClass,
        Runtime: runtimeClass,
        Protocol: protocolClass,
      });
    }

    beforeAll(async () => {
      appChain = createAppChain();

      appChain.configure({
        Runtime: {
          Balance: {},
        },
        Sequencer: {
          Database: {},
          BlockTrigger: {},
          Mempool: {},
          BatchProducerModule: {},
          BlockProducerModule: {},
          LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
          BaseLayer: {},
          TaskQueue: {},
          FeeStrategy: {},
          SequencerStartupModule: {},
        },
        Protocol: Protocol.defaultConfig(),
      });

      await appChain.start(false);

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
        .produceBlock();

      expectDefined(generatedBlock);

      const blocks = await sequencer.resolve("BlockQueue").getNewBlocks();

      expect(blocks).toHaveLength(1);

      const { block } = blocks[0];

      expect(block.hash).toStrictEqual(generatedBlock.hash);

      const blockStorage = sequencer.resolve("BlockStorage") as BlockStorage;
      const block2 = await blockStorage.getBlockAt(
        Number(blocks[0].block.height)
      );

      expectDefined(block2);
      expect(block2.hash).toStrictEqual(generatedBlock.hash);
      const input = block.transactions.flatMap((tx) =>
        tx.stateTransitions.flatMap((batch) =>
          batch.stateTransitions.map((st) =>
            UntypedStateTransition.fromJSON(st)
          )
        )
      );
      const stateDiff = collectStateDiff(input);

      const state = await unprovenState.getMany(
        Object.keys(stateDiff).map(Field)
      );

      expect(checkStateDiffEquality(stateDiff, state)).toBe(true);
      expect(state.length).toBeGreaterThanOrEqual(1);

      await expect(provenState.get(state[0].key)).resolves.toBeUndefined();
    });

    it("test proven block prod", async () => {
      const generatedBatch = await sequencer
        .resolve("BlockTrigger")
        .produceBatch();

      expectDefined(generatedBatch);

      const blocks = await sequencer.resolve("BlockQueue").getNewBlocks();
      expect(blocks).toHaveLength(0);

      const batchStorage = sequencer.resolve("BatchStorage") as BatchStorage;
      const batch = await batchStorage.getBatchAt(0);

      expectDefined(batch);
      expect(batch.height).toStrictEqual(generatedBatch?.height);

      await expect(batchStorage.getCurrentBatchHeight()).resolves.toStrictEqual(
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
      expect(txs[0].hash).toStrictEqual(tx.hash);

      await sequencer.resolve("BlockTrigger").produceBlock();

      await expect(
        txStorage.getPendingUserTransactions()
      ).resolves.toHaveLength(0);
    }, 60_000);
  }
);
