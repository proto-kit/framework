import { log } from "@proto-kit/common";
import { VanillaProtocolModules } from "@proto-kit/library";
import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
import { Bool, PrivateKey, UInt64 } from "o1js";
import "reflect-metadata";
import { container } from "tsyringe";
import { afterEach, expect } from "@jest/globals";

import {
  Sequencer,
  VanillaTaskWorkerModules,
  AppChain,
  InMemoryDatabase,
} from "../../src";
import {
  DefaultTestingSequencerModules,
  testingSequencerModules,
} from "../TestingSequencer";
import { RecursiveProofModule } from "../../src/sequencer/output/RecursiveProofModule";

import { Balance } from "./mocks/Balance";
import { BlockTestService } from "./services/BlockTestService";

describe("RecursiveProofModule", () => {
  let sequencer: Sequencer<
    DefaultTestingSequencerModules & {
      Database: typeof InMemoryDatabase;
      RecursiveProofModule: typeof RecursiveProofModule;
    }
  >;

  let appChain: AppChain<any>;

  let test: BlockTestService;

  beforeEach(async () => {
    const runtimeClass = Runtime.from({
      Balance,
    });

    const sequencerClass = Sequencer.from({
      ...testingSequencerModules({}),
      Database: InMemoryDatabase,
      RecursiveProofModule,
    });

    // TODO Analyze how we can get rid of the library import for mandatory modules
    const protocolClass = Protocol.from(
      VanillaProtocolModules.mandatoryModules({})
    );

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
        WorkerModule: VanillaTaskWorkerModules.defaultConfig(),
        BaseLayer: {},
        TaskQueue: {},
        FeeStrategy: {},
        SequencerStartupModule: {},
        RecursiveProofModule: {},
      },
      Runtime: {
        Balance: {},
      },
      Protocol: {
        ...Protocol.defaultConfig(),
      },
    });

    // Start AppChain
    await app.start(false, container.createChildContainer());

    appChain = app;

    ({ sequencer } = app);

    test = app.sequencer.dependencyContainer.resolve(BlockTestService);
  }, 30000);

  afterEach(async () => {
    await appChain.close();
  });

  it("should produce a dummy block proof", async () => {
    log.setLevel("DEBUG");
    expect.assertions(12);

    const outputModule = sequencer.resolve("RecursiveProofModule");

    const privateKey = PrivateKey.random();
    const publicKey = privateKey.toPublicKey();

    await test.addTransaction({
      method: ["Balance", "setBalanceIf"],
      privateKey,
      args: [publicKey, UInt64.from(100), Bool(true)],
    });

    // let [block, batch] = await blockTrigger.produceBlockAndBatch();
    const block = await test.produceBlock();

    expect(block).toBeDefined();
    expect(block!.transactions).toHaveLength(1);

    const batch = await test.produceBatch();

    expect(batch).toBeDefined();
    expect(batch!.blockHashes).toHaveLength(1);

    const recursiveBatch = await outputModule.proveRecursively();
    expect(recursiveBatch.proof.publicInput).toStrictEqual(
      batch!.proof.publicInput
    );

    // Second tx
    await test.addTransaction({
      method: ["Balance", "addBalanceToSelf"],
      privateKey,
      args: [UInt64.from(100), UInt64.from(1)],
    });

    log.info("Starting second block");

    const [block2, batch2] = await test.produceBlockAndBatch();

    expect(block2).toBeDefined();
    expect(block2!.transactions).toHaveLength(1);
    expect(batch2!.blockHashes).toHaveLength(1);

    const recursiveBatch2 = await outputModule.proveRecursively();
    expect(recursiveBatch2.proof.publicInput).toStrictEqual(
      batch!.proof.publicInput
    );
    expect(recursiveBatch2.proof.publicOutput).toStrictEqual(
      batch2!.proof.publicOutput
    );

    const storedProperty = await outputModule.readProof();
    expect(storedProperty).toBeDefined();
    expect(storedProperty!.toBatchHeight).toBe(1);
  }, 60_000);
});
