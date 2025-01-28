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
  DispatchSmartContract,
  Protocol,
  SettlementContractModule,
  SettlementSmartContract,
  SettlementSmartContractBase,
} from "@proto-kit/protocol";
import { VanillaProtocolModules } from "@proto-kit/library";
import { AppChain, InMemoryAreProofsEnabled } from "@proto-kit/sdk";
import { container } from "tsyringe";
import { PrivateKey, UInt64 } from "o1js";

import { testingSequencerFromModules } from "../TestingSequencer";
import {
  MinaBaseLayer,
  ProvenSettlementPermissions,
  SettlementModule,
  SettlementProvingTask,
  WithdrawalQueue,
} from "../../src";

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
          Balances: ProvenBalance,
        },

        config: {
          Balances: {},
        },
      });

      const sequencerClass = testingSequencerFromModules(
        {
          BaseLayer: MinaBaseLayer,
          SettlementModule,
          OutgoingMessageQueue: WithdrawalQueue,
        },
        {
          SettlementProvingTask,
        }
      );

      // TODO Analyze how we can get rid of the library import for mandatory modules
      const protocolClass = Protocol.from({
        modules: {
          ...VanillaProtocolModules.mandatoryModules({
            ProtocolStateTestHook,
            // ProtocolStateTestHook2,
          }),
          SettlementContractModule: SettlementContractModule.with({
            // FungibleToken: FungibleTokenContractModule,
            // FungibleTokenAdmin: FungibleTokenAdminContractModule,
          }),
        },
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
          TaskQueue: {},
          FeeStrategy: {},
          SequencerStartupModule: {},
          BaseLayer: {
            network: {
              type: "local",
            },
          },
          SettlementModule: {},
          OutgoingMessageQueue: {},
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
            BridgeContract: {
              withdrawalStatePath: "Withdrawals.withdrawals",
              withdrawalEventName: "withdrawal",
            },
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
      } catch (e) {
        console.error(e);
        throw e;
      }
    },
    timeout
  );

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
      SettlementSmartContractBase.args = {
        DispatchContract: DispatchSmartContract,
        ChildVerificationKeyService: vkService,
        BridgeContractVerificationKey: MOCK_VERIFICATION_KEY,
        signedSettlements: false,
        BridgeContract: BridgeContract,
        hooks: [],
        BridgeContractPermissions:
          new ProvenSettlementPermissions().bridgeContractMina(),
        escapeHatchSlotsInterval: 1000,
      };
      const vk = await SettlementSmartContract.compile();
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
