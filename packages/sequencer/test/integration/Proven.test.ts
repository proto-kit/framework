import "reflect-metadata";
import {
  expectDefined,
  log,
  MOCK_VERIFICATION_KEY,
  ChildVerificationKeyService,
  CompileRegistry,
} from "@proto-kit/common";
import { Runtime } from "@proto-kit/module";
import {
  BridgeContract,
  BridgingSettlementContract,
  BridgingSettlementContractArgs,
  ContractArgsRegistry,
  DispatchSmartContract,
  Protocol,
  SettlementContractModule,
} from "@proto-kit/protocol";
import { VanillaProtocolModules } from "@proto-kit/library";
import { container } from "tsyringe";
import { PrivateKey, UInt64 } from "o1js";

import { testingSequencerModules } from "../TestingSequencer";
import {
  MinaBaseLayer,
  ProvenSettlementPermissions,
  Sequencer,
  SettlementModule,
  SettlementProvingTask,
  VanillaTaskWorkerModules,
  AppChain,
  InMemoryAreProofsEnabled,
} from "../../src";
import { SettlementStartupModule } from "../../src/sequencer/SettlementStartupModule";

import { ProtocolStateTestHook } from "./mocks/ProtocolStateTestHook";
import { BlockTestService } from "./services/BlockTestService";
import { ProvenBalance } from "./mocks/ProvenBalance";

const timeout = 300000;

describe.skip("Proven", () => {
  let test: BlockTestService;

  let appChain: ReturnType<typeof createAppChain>;

  function createAppChain() {
    const runtimeClass = Runtime.from({
      Balances: ProvenBalance,
    });

    const sequencerClass = Sequencer.from(
      testingSequencerModules(
        {
          BaseLayer: MinaBaseLayer,
          SettlementModule,
        },
        {
          SettlementProvingTask,
        }
      )
    );

    // TODO Analyze how we can get rid of the library import for mandatory modules
    const protocolClass = Protocol.from({
      ...VanillaProtocolModules.mandatoryModules({
        ProtocolStateTestHook,
        // ProtocolStateTestHook2,
      }),
      SettlementContractModule: SettlementContractModule.from({
        ...SettlementContractModule.settlementAndBridging(),
        // FungibleToken: FungibleTokenContractModule,
        // FungibleTokenAdmin: FungibleTokenAdminContractModule,
      }),
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
          BlockProducerModule: {},
          LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
          TaskQueue: {},
          FeeStrategy: {},
          SequencerStartupModule: {},
          BaseLayer: {
            network: {
              type: "local",
            },
          },
          SettlementModule: {},
        },
        Runtime: {
          Balances: {},
        },
        Protocol: {
          AccountState: {},
          BlockProver: {},
          StateTransitionProver: {},
          BlockHeight: {},
          LastStateRoot: {},
          ProtocolStateTestHook: {},
          SettlementContractModule: {
            SettlementContract: {},
            BridgeContract: {},
            DispatchContract: {
              incomingMessagesMethods: {
                deposit: "Balances.deposit",
              },
            },
          },
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

  it("should compile settlement contracts", async () => {
    const module = appChain.sequencer.dependencyContainer.resolve(
      SettlementStartupModule
    );

    const vks = await module.retrieveVerificationKeys();

    console.log(vks);

    expect(vks.DispatchSmartContract).toBeDefined();
    expect(vks.SettlementSmartContract).toBeDefined();
  });

  it.skip("Hello", async () => {
    try {
      const vkService = new ChildVerificationKeyService();
      const proofs = new InMemoryAreProofsEnabled();
      proofs.setProofsEnabled(true);
      const registry = new CompileRegistry(proofs);
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

      expect(batch.proof.proof.length).toBeGreaterThan(50);
      expect(batch.blockHashes).toHaveLength(1);
    },
    timeout
  );
});
