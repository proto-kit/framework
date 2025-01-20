import "reflect-metadata";
import { expectDefined, log } from "@proto-kit/common";
import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
import { VanillaProtocolModules } from "@proto-kit/library";
import { AppChain } from "@proto-kit/sdk";
import { container } from "tsyringe";
import { PrivateKey, UInt64 } from "o1js";

import { testingSequencerFromModules } from "../TestingSequencer";

import { ProtocolStateTestHook } from "./mocks/ProtocolStateTestHook";
import { BlockTestService } from "./services/BlockTestService";
import { ProvenBalance } from "./mocks/ProvenBalance";

const timeout = 300000;

describe("Proven", () => {
  let test: BlockTestService;

  it(
    "should start up and compile",
    async () => {
      log.setLevel(log.levels.DEBUG);
      const runtimeClass = Runtime.from({
        modules: {
          Balance: ProvenBalance,
        },

        config: {
          Balance: {},
        },
      });

      const sequencerClass = testingSequencerFromModules({});

      // TODO Analyze how we can get rid of the library import for mandatory modules
      const protocolClass = Protocol.from({
        modules: VanillaProtocolModules.mandatoryModules({
          ProtocolStateTestHook,
          // ProtocolStateTestHook2,
        }),
        // modules: VanillaProtocolModules.with({}),
      });

      const app = AppChain.from({
        Runtime: runtimeClass,
        Sequencer: sequencerClass,
        Protocol: protocolClass,
        modules: {},
      });

      app.configure({
        Sequencer: {
          Database: {},
          BlockTrigger: {},
          Mempool: {},
          BatchProducerModule: {},
          BlockProducerModule: {},
          LocalTaskWorkerModule: {},
          BaseLayer: {},
          TaskQueue: {},
          FeeStrategy: {},
          SequencerStartupModule: {},
        },
        Runtime: {
          Balance: {},
        },
        Protocol: {
          AccountState: {},
          BlockProver: {},
          StateTransitionProver: {},
          BlockHeight: {},
          LastStateRoot: {},
          ProtocolStateTestHook: {},
          // ProtocolStateTestHook2: {},
        },
      });

      try {
        // Start AppChain
        const childContainer = container.createChildContainer();
        await app.start(true, childContainer);

        test = app.sequencer.dependencyContainer.resolve(BlockTestService);
      } catch (e) {
        console.error(e);
        throw e;
      }
    },
    timeout
  );

  it(
    "should produce simple block",
    async () => {
      expect.assertions(6);

      log.setLevel("INFO");

      const privateKey = PrivateKey.random();

      await test.addTransaction({
        method: ["Balance", "addBalance"],
        privateKey,
        args: [PrivateKey.random().toPublicKey(), UInt64.from(100)],
      });

      const [block, batch] = await test.produceBlockAndBatch();

      expectDefined(block);

      expect(block.transactions).toHaveLength(1);
      expect(block.transactions[0].status.toBoolean()).toBe(true);

      expectDefined(batch);

      console.log(batch.proof);

      expect(batch.proof.proof.length).toBeGreaterThan(50);
      expect(batch.blockHashes).toHaveLength(1);
    },
    timeout
  );
});
