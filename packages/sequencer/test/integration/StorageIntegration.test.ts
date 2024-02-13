import { beforeEach, expect } from "@jest/globals";
import {
  DefaultTestingSequencerModules,
  testingSequencerFromModules,
} from "../TestingSequencer";
import { Runtime } from "@proto-kit/module";
import { Balance } from "./mocks/Balance";
import {
  ProtocolCustomModulesRecord,
  VanillaProtocol,
} from "@proto-kit/protocol";
import { AppChain } from "@proto-kit/sdk";
import {
  AsyncMerkleTreeStore,
  AsyncStateService,
  BlockStorage,
  HistoricalBlockStorage,
  InMemoryDatabase,
  Sequencer,
  StateEntry,
  StateRecord,
} from "../../src";
import { collectStateDiff, createTransaction, expectDefined } from "./utils";
import { Bool, Field, PrivateKey, UInt64 } from "o1js";

function checkStateDiffEquality(stateDiff: StateRecord, state: StateEntry[]) {
  return Object.entries(stateDiff)
    .map(([key, value]) => {
      const entry = state.find((s) => s.key.toString() === key);
      if (entry !== undefined) {
        if (entry.value === undefined) {
          return value === undefined;
        } else if (value !== undefined) {
          return entry.value.find((v, i) => v !== value[i]) === undefined;
        }
      }
      return false;
    })
    .reduce((acc, v) => acc && v, true);
}

describe.each([["InMemory", InMemoryDatabase]])(
  "Storage Adapter Test %s",
  (testName, Database) => {
    let appChain: AppChain<
      { Balance: typeof Balance },
      ProtocolCustomModulesRecord,
      DefaultTestingSequencerModules & { Database: typeof Database },
      {}
    >;
    let sequencer: Sequencer<
      DefaultTestingSequencerModules & { Database: typeof Database }
    >;
    let runtime: Runtime<{ Balance: typeof Balance }>;

    let unprovenState: AsyncStateService;
    let provenState: AsyncStateService;

    let unprovenTreeStore: AsyncMerkleTreeStore;
    let provenTreeStore: AsyncMerkleTreeStore;

    const sk = PrivateKey.random();
    const pk = sk.toPublicKey();

    beforeAll(async () => {
      const sequencerClass = testingSequencerFromModules({
        Database,
      });

      const runtimeClass = Runtime.from({
        modules: {
          Balance,
        },
      });

      const protocolClass = VanillaProtocol.create();

      appChain = AppChain.from({
        sequencer: sequencerClass,
        runtime: runtimeClass,
        protocol: protocolClass,
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

      unprovenTreeStore = sequencer.resolve("UnprovenMerkleStore");
      provenTreeStore = sequencer.resolve("AsyncMerkleStore");
    });

    it("test unproven block prod", async () => {
      appChain.sequencer.resolve("Mempool").add(
        createTransaction({
          runtime,
          method: ["Balance", "setBalanceIf"],
          privateKey: sk,
          args: [pk, UInt64.from(100), Bool(true)],
          nonce: 0,
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

      const stateDiff = collectStateDiff(
        block.block.transactions.flatMap((tx) =>
          tx.stateTransitions.concat(tx.protocolTransitions)
        )
      );

      const state = await unprovenState.getAsync(
        Object.keys(stateDiff).map(Field)
      );

      expect(checkStateDiffEquality(stateDiff, state)).toBe(true);

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
    });
  }
);
