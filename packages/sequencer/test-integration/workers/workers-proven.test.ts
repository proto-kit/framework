import "reflect-metadata";
import { expectDefined, log, sleep } from "@proto-kit/common";
import { AppChain } from "@proto-kit/sdk";
import { container } from "tsyringe";
import { PrivateKey, UInt64 } from "o1js";
import { BlockTestService } from "../../test/integration/services/BlockTestService";
import { BullQueue } from "@proto-kit/deployment";
import {
  BullConfig,
  protocolClass,
  runtimeClass,
  runtimeProtocolConfig,
} from "./modules";
import {
  BatchProducerModule,
  BlockProducerModule,
  InMemoryDatabase,
  ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  Sequencer,
  SequencerStartupModule,
} from "../../src";
import { ConstantFeeStrategy } from "../../src/protocol/baselayer/fees/ConstantFeeStrategy";
import { ChildProcessWorker } from "./ChildProcessWorker";

const timeout = 300000;

describe("worker-proven", () => {
  describe("sequencer", () => {
    let test: BlockTestService;

    let worker: ChildProcessWorker;

    let appChain: AppChain<any, any, any, any>;

    beforeAll(async () => {
      worker = new ChildProcessWorker();
      worker.start(true);
    });

    afterAll(() => {
      worker.kill();
    });

    it(
      "should start up and compile",
      async () => {
        log.setLevel(log.levels.DEBUG);

        const sequencerClass = Sequencer.from({
          modules: {
            Database: InMemoryDatabase,
            Mempool: PrivateMempool,
            BaseLayer: NoopBaseLayer,
            BatchProducerModule,
            BlockProducerModule,
            BlockTrigger: ManualBlockTrigger,
            TaskQueue: BullQueue,
            FeeStrategy: ConstantFeeStrategy,
            SequencerStartupModule,
          },
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
            BaseLayer: {},
            TaskQueue: BullConfig,
            FeeStrategy: {},
            SequencerStartupModule: {},
          },
          ...runtimeProtocolConfig,
        });

        try {
          // Start AppChain
          const childContainer = container.createChildContainer();
          await app.start(false, childContainer);

          test = app.sequencer.dependencyContainer.resolve(BlockTestService);

          appChain = app;
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
});
