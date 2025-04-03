import "reflect-metadata";
import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
import { VanillaProtocolModules } from "@proto-kit/library";
import { container } from "tsyringe";
import { jest } from "@jest/globals";
import { expectDefined } from "@proto-kit/common";

import {
  BlockQueue,
  ManualBlockTrigger,
  Sequencer,
  VanillaTaskWorkerModules,
  AppChain,
  BlockResultService,
} from "../../../../src";
import { ProtocolStateTestHook } from "../../../integration/mocks/ProtocolStateTestHook";
import { testingSequencerModules } from "../../../TestingSequencer";
import { Balance } from "../../../integration/mocks/Balance";

describe("atomic block production", () => {
  let appchain: ReturnType<typeof createAppChain>;

  let trigger: ManualBlockTrigger;

  function createAppChain() {
    const runtimeClass = Runtime.from({
      modules: {
        Balance,
      },

      config: {
        Balance: {},
      },
    });

    const sequencerClass = Sequencer.from({
      modules: testingSequencerModules({}),
    });

    const protocolClass = Protocol.from({
      modules: VanillaProtocolModules.mandatoryModules({
        ProtocolStateTestHook,
      }),
    });

    return AppChain.from({
      modules: {
        Runtime: runtimeClass,
        Sequencer: sequencerClass,
        Protocol: protocolClass,
      },
    });
  }

  beforeEach(async () => {
    const app = createAppChain();

    app.configure({
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
      },
    });

    appchain = app;

    // Start AppChain
    await app.start(false, container.createChildContainer());

    trigger = app.sequencer.resolve("BlockTrigger");
  });

  /**
   * This test does two passes on block generation.
   * In the first, the metadata generation function is mocked to throw an error
   * This leads to the block being produced, but the result generation to fail.
   * Then, the mock is released. After that, the blockResultCompleteCheck()
   * should correctly detect the missing results and re-generate it, so that
   * the second block production can succeed
   */
  it("should recover from non-generated metadata", async () => {
    expect.assertions(6);

    const module =
      appchain.sequencer.dependencyContainer.resolve(BlockResultService);

    module.generateMetadataForNextBlock = jest
      .fn(module.generateMetadataForNextBlock)
      .mockImplementationOnce(() => {
        throw new Error("Test error");
      });

    await expect(() => trigger.produceBlock()).rejects.toThrow();

    // This checks that it correctly throws when producing a block with no previous result existing
    await expect(() => trigger.produceBlock()).rejects.toThrow();

    await appchain.sequencer
      .resolve("BlockProducerModule")
      .blockResultCompleteCheck();

    const blockQueue =
      appchain.sequencer.dependencyContainer.resolve<BlockQueue>("BlockQueue");
    const queueData = await blockQueue.getLatestBlockAndResult();

    expectDefined(queueData);
    expectDefined(queueData.result);

    const block = await trigger.produceBlock();

    expectDefined(block);
    expect(block.height.toString()).toBe("1");
  });
});
