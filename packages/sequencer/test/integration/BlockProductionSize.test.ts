import { log } from "@proto-kit/common";
import { VanillaProtocolModules } from "@proto-kit/library";
import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
import { AppChain } from "@proto-kit/sdk";
import { Bool, PrivateKey, Struct, UInt64 } from "o1js";
import "reflect-metadata";
import { container } from "tsyringe";

import { ManualBlockTrigger, PrivateMempool, Sequencer } from "../../src";
import {
  DefaultTestingSequencerModules,
  testingSequencerFromModules,
} from "../TestingSequencer";

import { Balance } from "./mocks/Balance";
import { ProtocolStateTestHook } from "./mocks/ProtocolStateTestHook";
import { createTransaction } from "./utils";
import { NoopRuntime } from "./mocks/NoopRuntime";

export class PrimaryTestEvent extends Struct({
  message: Bool,
}) {}

export class SecondaryTestEvent extends Struct({
  message: Bool,
}) {}

describe("block limit", () => {
  let runtime: Runtime<{
    Balance: typeof Balance;
    NoopRuntime: typeof NoopRuntime;
  }>;
  let sequencer: Sequencer<DefaultTestingSequencerModules>;

  let blockTrigger: ManualBlockTrigger;
  let mempool: PrivateMempool;

  log.setLevel(log.levels.INFO);

  const runtimeClass = Runtime.from({
    modules: {
      Balance,
      NoopRuntime,
    },

    config: {
      Balance: {},
      NoopRuntime: {},
    },
  });

  async function setUpAppChain(maxBlockSize: number | undefined) {
    const sequencerClass = testingSequencerFromModules({});

    const protocolClass = Protocol.from({
      modules: VanillaProtocolModules.mandatoryModules({
        ProtocolStateTestHook,
      }),
    });

    const app = AppChain.from({
      Runtime: runtimeClass,
      Sequencer: sequencerClass,
      Protocol: protocolClass,
      modules: {},
    });
    log.setLevel("TRACE");

    app.configure({
      Sequencer: {
        Database: {},
        BlockTrigger: {},
        Mempool: {},
        BatchProducerModule: {},
        BlockProducerModule: {
          maximumBlockSize: maxBlockSize,
        },
        LocalTaskWorkerModule: {},
        BaseLayer: {},
        TaskQueue: {},
        FeeStrategy: {},
        ProtocolStartupModule: {},
      },
      Runtime: {
        Balance: {},
        NoopRuntime: {},
      },
      Protocol: {
        AccountState: {},
        BlockProver: {},
        StateTransitionProver: {},
        BlockHeight: {},
        LastStateRoot: {},
        ProtocolStateTestHook: {},
      },
    });

    // Start AppChain
    await app.start(false, container.createChildContainer());

    ({ runtime, sequencer } = app);

    mempool = sequencer.resolve("Mempool");

    const privateKey = PrivateKey.random();

    for (let i = 0; i < 40; i++) {
      const tx = createTransaction({
        runtime,
        method: ["Balance", "setBalanceIf"],
        privateKey: privateKey,
        args: [privateKey.toPublicKey(), UInt64.from(100), Bool(true)],
        nonce: i,
      });
      await mempool.add(tx);
    }
  }

  it.each([
    [5, 5],
    [10, 10],
    [15, 15],
    [25, 25],
    [35, 35],
    [undefined, 20],
  ])(
    "when limit is set to %p should produce block with maximum size %p",
    async (limit, maxValue) => {
      await setUpAppChain(limit);

      blockTrigger = sequencer.resolve("BlockTrigger");

      const block = await blockTrigger.produceBlock();

      expect(block).toBeDefined();
      expect(block!.transactions).toHaveLength(maxValue);
    },
    30000
  );
});
