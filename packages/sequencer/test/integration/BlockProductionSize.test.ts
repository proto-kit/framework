import { log } from "@proto-kit/common";
import { VanillaProtocolModules } from "@proto-kit/library";
import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
import { Bool, PrivateKey, Struct, UInt64 } from "o1js";
import "reflect-metadata";
import { container } from "tsyringe";
import { afterEach } from "@jest/globals";

import {
  ManualBlockTrigger,
  PrivateMempool,
  Sequencer,
  VanillaTaskWorkerModules,
  AppChain,
} from "../../src";
import {
  DefaultTestingSequencerModules,
  testingSequencerModules,
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
  let appchain: AppChain<any>;

  let blockTrigger: ManualBlockTrigger;
  let mempool: PrivateMempool;

  log.setLevel(log.levels.INFO);

  const runtimeClass = Runtime.from({
    Balance,
    NoopRuntime,
  });

  async function setUpAppChain(maxBlockSize: number | undefined) {
    const sequencerClass = Sequencer.from(testingSequencerModules({}));

    const protocolClass = Protocol.from(
      VanillaProtocolModules.mandatoryModules({
        ProtocolStateTestHook,
      })
    );

    const app = AppChain.from({
      Runtime: runtimeClass,
      Sequencer: sequencerClass,
      Protocol: protocolClass,
    });
    log.setLevel("TRACE");

    app.configure({
      Sequencer: {
        Database: {},
        BlockTrigger: {},
        Mempool: {
          validationEnabled: true,
        },
        BatchProducerModule: {},
        BlockProducerModule: {
          maximumBlockSize: maxBlockSize,
        },
        LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
        BaseLayer: {},
        TaskQueue: {},
        FeeStrategy: {},
        SequencerStartupModule: {},
      },
      Runtime: {
        Balance: {},
        NoopRuntime: {},
      },
      Protocol: {
        ...Protocol.defaultConfig(),
        ProtocolStateTestHook: {},
      },
    });

    // Start AppChain
    await app.start(false, container.createChildContainer());

    ({ runtime, sequencer } = app);
    appchain = app;

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

  afterEach(async () => {
    await appchain.close();
  });

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
    60_000
  );
});
