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

const numWorkers = 4;

describe("worker-proven", () => {
  describe("sequencer", () => {
    let test: BlockTestService;

    const workers: ChildProcessWorker[] = [];

    let appChain: AppChain<any>;

    beforeAll(async () => {
      for (let i = 0; i < numWorkers; i++) {
        const worker = new ChildProcessWorker();
        worker.start(`worker-${i}`, true, {
          PROOFS_ENABLED: `${proofsEnabled}`,
        });
        workers.push(worker);
      }
    });

    afterAll(async () => {
      workers.forEach((worker) => {
        worker.kill();
      });

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
            BlockProducerModule: {
              maximumBlockSize: 5,
            },
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

        const txs = 4;

        for (let i = 0; i < txs; i++) {
          await test.addTransaction({
            method: ["Balance", "addBalance"],
            privateKey,
            args: [PrivateKey.random().toPublicKey(), UInt64.from(100)],
          });
        }

        const [block, batch] = await test.produceBlockAndBatch();

        expectDefined(block);

        expect(block.transactions).toHaveLength(txs);
        expect(block.transactions[0].status.toBoolean()).toBe(true);

        expectDefined(batch);

        console.log(batch.proof);

        expect(batch.proof.proof.length).toBeGreaterThan(
          proofsEnabled ? 50 : 0
        );
        expect(batch.blockHashes).toHaveLength(1);
      },
      timeout
    );

    it.each([
      [5, 4],
      [14, 10],
    ])(
      "should produce a batch of a %s of blocks",
      async (numBlocks, txs) => {
        const privateKey = PrivateKey.random();

        for (let i = 0; i < txs; i++) {
          await test.addTransaction({
            method: ["Balance", "addBalance"],
            privateKey,
            args: [PrivateKey.random().toPublicKey(), UInt64.from(100)],
          });
        }

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
