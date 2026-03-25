import "reflect-metadata";
import {
  expectDefined,
  log,
  MOCK_VERIFICATION_KEY,
  ChildVerificationKeyService,
  CompileRegistry,
  range,
} from "@proto-kit/common";
import { Runtime } from "@proto-kit/module";
import {
  BridgeContract,
  BridgingSettlementContract,
  BridgingSettlementContractArgs,
  ContractArgsRegistry,
  DispatchSmartContract,
  Protocol,
} from "@proto-kit/protocol";
import { VanillaProtocolModules } from "@proto-kit/library";
import { container } from "tsyringe";
import { PrivateKey, UInt64, setBackend } from "o1js";

import { testingSequencerModules } from "../test/TestingSequencer";
import {
  ProvenSettlementPermissions,
  Sequencer,
  VanillaTaskWorkerModules,
  AppChain,
  InMemoryAreProofsEnabled,
  SettlementStartupModule,
} from "../src";

import { BlockTestService } from "../test/integration/services/BlockTestService";
import { ProvenBalance } from "../test/integration/mocks/ProvenBalance";

const timeout = 300000;

setBackend("native");

describe("Proven", () => {
  let test: BlockTestService;

  let appChain: ReturnType<typeof createAppChain>;

  function createAppChain() {
    const runtimeClass = Runtime.from({
      Balances: ProvenBalance,
    });

    const sequencerClass = Sequencer.from(
      testingSequencerModules(
        {
          // BaseLayer: MinaBaseLayer,
          // SettlementModule,
        },
        {
          // SettlementProvingTask,
        }
      )
    );

    // TODO Analyze how we can get rid of the library import for mandatory modules
    const protocolClass = Protocol.from({
      ...VanillaProtocolModules.mandatoryModules({
        // ProtocolStateTestHook,
        // ProtocolStateTestHook2,
      }),
      // SettlementContractModule: SettlementContractModule.from({
      //   ...SettlementContractModule.settlementAndBridging(),
      // FungibleToken: FungibleTokenContractModule,
      // FungibleTokenAdmin: FungibleTokenAdminContractModule,
      // }),
      // modules: VanillaProtocolModules.with({}),
    });

    return AppChain.from({
      Runtime: runtimeClass,
      Sequencer: sequencerClass,
      Protocol: protocolClass,
    });
  }

  it(
    "should start up and compile",
    async () => {
      log.setLevel(log.levels.DEBUG);

      const app = createAppChain();

      app.configure({
        Sequencer: {
          Database: {},
          BlockTrigger: {},
          Mempool: {},
          BatchProducerModule: {},
          BlockProducerModule: {
            maximumBlockSize: 5,
          },
          LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
          TaskQueue: {},
          FeeStrategy: {},
          SequencerStartupModule: {},
          BaseLayer: {
            //   network: {
            //     type: "local",
            //   },
          },
          // SettlementModule: {},
        },
        Runtime: {
          Balances: {},
        },
        Protocol: {
          ...Protocol.defaultConfig(),
          // ProtocolStateTestHook: {},
          // SettlementContractModule: {
          //   SettlementContract: {},
          //   BridgeContract: {},
          //   DispatchContract: {
          //     incomingMessagesMethods: {
          //       deposit: "Balances.deposit",
          //     },
          //   },
          // },
          // ProtocolStateTestHook2: {},
        },
      });

      try {
        // Start AppChain
        const childContainer = container.createChildContainer();
        await app.start(true, childContainer);

        test = app.sequencer.dependencyContainer.resolve(BlockTestService);

        appChain = app;
      } catch (e) {
        console.error(e);
        throw e;
      }
    },
    timeout
  );

  it.skip("should compile settlement contracts", async () => {
    const module = appChain.sequencer.dependencyContainer.resolve(
      SettlementStartupModule
    );

    const vks = await module.retrieveVerificationKeys({
      SettlementContract: true,
      DispatchSmartContract: true,
    });

    console.log(vks);

    expect(vks.DispatchSmartContract).toBeDefined();
    expect(vks.SettlementContract).toBeDefined();
  });

  it.skip("Hello", async () => {
    try {
      const vkService = new ChildVerificationKeyService();
      const proofs = new InMemoryAreProofsEnabled();
      proofs.setProofsEnabled(true);
      const registry =
        appChain.sequencer.dependencyContainer.resolve(CompileRegistry);
      registry.addArtifactsRaw({
        BlockProver: {
          verificationKey: MOCK_VERIFICATION_KEY,
        },
      });
      vkService.setCompileRegistry(registry);

      container
        .resolve(ContractArgsRegistry)
        .addArgs<BridgingSettlementContractArgs>("SettlementContract", {
          DispatchContract: DispatchSmartContract,
          ChildVerificationKeyService: vkService,
          BridgeContractVerificationKey: MOCK_VERIFICATION_KEY,
          signedSettlements: false,
          BridgeContract: BridgeContract,
          hooks: [],
          BridgeContractPermissions:
            new ProvenSettlementPermissions().bridgeContractMina(),
          escapeHatchSlotsInterval: 1000,
        });
      const vk = await BridgingSettlementContract.compile();
      console.log(vk.verificationKey);
    } catch (e) {
      console.error(e);
    }
  }, 500000);

  it(
    "should produce simple block",
    async () => {
      expect.assertions(6);

      log.setLevel("INFO");

      const privateKey = PrivateKey.random();

      await test.addTransaction({
        method: ["Balances", "addBalance"],
        privateKey,
        args: [PrivateKey.random().toPublicKey(), UInt64.from(100)],
      });

      const [block, batch] = await test.produceBlockAndBatch();

      expectDefined(block);

      expect(block.transactions).toHaveLength(1);
      expect(block.transactions[0].status.toBoolean()).toBe(true);

      expectDefined(batch);

      console.log(batch.proof);

      expect(batch.blockHashes).toHaveLength(1);
      expect(batch.proof.proof.length).toBeGreaterThan(50);
    },
    timeout
  );

  it(
    "should produce large block",
    async () => {
      log.setLevel("INFO");

      const privateKey = PrivateKey.random();

      for (const i of range(0, 30)) {
        await test.addTransaction({
          method: ["Balances", "addBalance"],
          privateKey,
          args: [PrivateKey.random().toPublicKey(), UInt64.from(100)],
        });
      }

      // Produce 6 blocks, 5 txs each into 1 batch
      const block = await test.produceBlock();

      expectDefined(block);
      expect(block.transactions).toHaveLength(5);
      expect(block.transactions[0].status.toBoolean()).toBe(true);

      await test.produceBlock();
      await test.produceBlock();
      await test.produceBlock();
      await test.produceBlock();
      await test.produceBlock();
      const batch = await test.produceBatch();

      expectDefined(batch);

      console.log(batch.proof);

      expect(batch.blockHashes).toHaveLength(6);
      expect(batch.proof.proof.length).toBeGreaterThan(50);
    },
    timeout * 10
  );

  it(
    "should produce empty + 1 tx",
    async () => {
      log.setLevel("INFO");

      const privateKey = PrivateKey.random();

      // await test.produceBlock();
      // await test.produceBlock();
      // await test.produceBlock();

      await test.addTransaction({
        method: ["Balances", "addBalance"],
        privateKey,
        args: [PrivateKey.random().toPublicKey(), UInt64.from(100)],
      });

      // Produce 6 blocks, 5 txs each into 1 batch
      const block = await test.produceBlock();
      await test.produceBlock();
      await test.produceBlock();
      await test.produceBlock();

      expectDefined(block);
      expect(block.transactions).toHaveLength(1);
      expect(block.transactions[0].status.toBoolean()).toBe(true);

      const batch = await test.produceBatch();

      expectDefined(batch);

      console.log(batch.proof);

      expect(batch.blockHashes).toHaveLength(4);
      expect(batch.proof.proof.length).toBeGreaterThan(50);
    },
    timeout * 10
  );

  afterAll(async () => {
    await appChain.close();
  });
});
