import {
  PrivateMempool,
  SequencerStartupModule,
  WorkerModule,
  VanillaTaskWorkerModules,
  MinaBaseLayer,
  ConstantFeeStrategy,
  BatchProducerModule,
  SettlementModule,
  LocalTaskQueue,
  InMemoryMinaSigner,
  BridgingModule,
} from "@proto-kit/sequencer";
import { PrivateKey } from "o1js";

import { getRequiredEnv } from "./loadEnv";

export const scriptModules = {
  BaseLayer: MinaBaseLayer,
  FeeStrategy: ConstantFeeStrategy,
  BatchProducerModule,
  SettlementModule,
  SettlementSigner: InMemoryMinaSigner,
  BridgingModule,
  Mempool: PrivateMempool,
  TaskQueue: LocalTaskQueue,
  WorkerModule: WorkerModule.from(VanillaTaskWorkerModules.allTasks()),
  SequencerStartupModule,
};

export const scriptModulesConfig = {
  BaseLayer: {
    network: {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      type: getRequiredEnv("MINA_NETWORK") as "local" | "lightnet" | "remote",
      graphql: getRequiredEnv("MINA_NODE_GRAPHQL"),
      archive: getRequiredEnv("MINA_ARCHIVE_GRAPHQL"),
      accountManager: getRequiredEnv("MINA_ACCOUNT_MANAGER_URL"),
    },
  },
  SettlementModule: {
    addresses: {
      SettlementContract: PrivateKey.fromBase58(
        getRequiredEnv("PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY")
      ).toPublicKey(),
    },
  },
  BridgingModule: {
    addresses: {
      DispatchContract: PrivateKey.fromBase58(
        getRequiredEnv("PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY")
      ).toPublicKey(),
    },
  },
  SettlementSigner: {
    feepayer: PrivateKey.fromBase58(
      getRequiredEnv("PROTOKIT_SEQUENCER_PRIVATE_KEY")
    ),
    contractKeys: [
      PrivateKey.fromBase58(
        getRequiredEnv("PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY")
      ),
      PrivateKey.fromBase58(
        getRequiredEnv("PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY")
      ),
      PrivateKey.fromBase58(
        getRequiredEnv("PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY")
      ),
    ],
  },
  FeeStrategy: {},
  BatchProducerModule: {},
  WorkerModule: VanillaTaskWorkerModules.defaultConfig(),
  SequencerStartupModule: {},
  TaskQueue: {
    simulatedDuration: 0,
  },
  LocalTaskWorker: VanillaTaskWorkerModules.defaultConfig(),
  Mempool: {},
};
