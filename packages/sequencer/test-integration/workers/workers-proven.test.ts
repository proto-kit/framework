import "reflect-metadata";
import { container } from "tsyringe";
import { PrivateKey, UInt64 } from "o1js";
import { expectDefined, log } from "@proto-kit/common";
import { BullQueue } from "@proto-kit/deployment";

import {
  BatchProducerModule,
  BlockProducerModule,
  InMemoryDatabase,
  ManualBlockTrigger,
  PrivateMempool,
  Sequencer,
  SequencerStartupModule,
  AppChain,
  ConstantFeeStrategy,
} from "../../src";
import { BlockTestService } from "../../test/integration/services/BlockTestService";

import {
  BullConfig,
  protocolClass,
  runtimeClass,
  runtimeProtocolConfig,
} from "./modules";
import { ChildProcessWorker } from "./ChildProcessWorker";

const timeout = 300000;

const proofsEnabled = false;

describe("worker-proven", () => {
  describe("sequencer", () => {
    let test: BlockTestService;

    let worker: ChildProcessWorker;

    let appChain: AppChain<any>;

    beforeAll(async () => {
      worker = new ChildProcessWorker();
      worker.start(true, { PROOFS_ENABLED: `${proofsEnabled}` });
    });

    afterAll(async () => {
      worker.kill();

      await appChain.close();
    });

    it(
      "should start up and compile",
      async () => {
        log.setLevel(log.levels.DEBUG);

        const sequencerClass = Sequencer.from({
          Database: InMemoryDatabase,
          Mempool: PrivateMempool,
          // BaseLayer: NoopBaseLayer,
          BatchProducerModule,
          BlockProducerModule,
          BlockTrigger: ManualBlockTrigger,
          TaskQueue: BullQueue,
          FeeStrategy: ConstantFeeStrategy,
          SequencerStartupModule,
        });

        const app = AppChain.from({
          Runtime: runtimeClass,
          Sequencer: sequencerClass,
          Protocol: protocolClass,
        });

        app.configure({
          Sequencer: {
            Database: {},
            BlockTrigger: {},
            Mempool: {},
            BatchProducerModule: {},
            BlockProducerModule: {},
            // BaseLayer: {},
            TaskQueue: BullConfig,
            FeeStrategy: {},
            SequencerStartupModule: {},
          },
          ...runtimeProtocolConfig,
        });

        try {
          // Start AppChain
          const childContainer = container.createChildContainer();
          await app.start(proofsEnabled, childContainer);

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
        expect(block.transactions[0].status).toBe(true);

        expectDefined(batch);

        console.log(batch.proof);

        expect(batch.proof.proof.length).toBeGreaterThan(
          proofsEnabled ? 50 : 0
        );
        expect(batch.blockHashes).toHaveLength(1);
      },
      timeout
    );

    it.each([5, 14, 20])(
      "should produce a batch of a %s of blocks",
      async (numBlocks) => {
        for (let i = 0; i < numBlocks; i++) {
          await test.produceBlock();
        }

        const batch = await test.produceBatch();

        expectDefined(batch);

        console.log(batch.proof);

        expect(batch.proof.proof.length).toBeGreaterThan(
          proofsEnabled ? 50 : 0
        );
        expect(batch.blockHashes).toHaveLength(numBlocks);
      },
      timeout
    );
  });
});
