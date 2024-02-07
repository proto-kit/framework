import { InMemoryDatabase } from "@proto-kit/sequencer";
import { beforeEach } from "@jest/globals";
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
  () => {
    let appChain: AppChain<
      { Balance: typeof Balance },
      ProtocolCustomModulesRecord,
      DefaultTestingSequencerModules,
      {}
    >;
    let sequencer: Sequencer<DefaultTestingSequencerModules>;
    let runtime: Runtime<{ Balance: typeof Balance }>;

    let unprovenState: AsyncStateService;
    let provenState: AsyncStateService;

    let unprovenTreeStore: AsyncMerkleTreeStore;
    let provenTreeStore: AsyncMerkleTreeStore;

    const sk = PrivateKey.random();
    const pk = sk.toPublicKey();

    beforeEach(async () => {
      const sequencerClass = testingSequencerFromModules({
        // Database2: InMemoryDatabase,
      });

      const runtimeClass = Runtime.from({
        modules: {
          Balance,
        },
      });

      const protocolClass = VanillaProtocol.create();

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
    });
  }
);
