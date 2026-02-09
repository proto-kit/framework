import "reflect-metadata";
import {
  BlockStorageNetworkStateModule,
  ClientAppChain,
  InMemoryBlockExplorer,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "@proto-kit/sdk";
import { PrivateKey } from "o1js";
import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
import {
  VanillaProtocolModules,
  VanillaRuntimeModules,
} from "@proto-kit/library";
import { log } from "@proto-kit/common";
import {
  BatchProducerModule,
  BlockProducerModule,
  InMemoryDatabase,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  Sequencer,
  SequencerStartupModule,
  VanillaTaskWorkerModules,
} from "@proto-kit/sequencer";
import { container } from "tsyringe";
import { S3RemoteCache } from "@proto-kit/deployment";

import { TestBalances } from "../../src/helpers/TestBalance";
import * as fs from "node:fs";
import cachedir from "cachedir";

export async function startAppChain() {
  const appChain = ClientAppChain.from({
    Runtime: Runtime.from(
      VanillaRuntimeModules.with({
        Balances: TestBalances,
      })
    ),

    Protocol: Protocol.from(VanillaProtocolModules.with({})),

    Sequencer: Sequencer.from({
      Database: InMemoryDatabase,

      Mempool: PrivateMempool,
      LocalTaskWorkerModule: LocalTaskWorkerModule.from(
        VanillaTaskWorkerModules.withoutSettlement()
      ),

      BaseLayer: NoopBaseLayer,
      BatchProducerModule,
      BlockProducerModule,
      BlockTrigger: ManualBlockTrigger,
      TaskQueue: LocalTaskQueue,
      RemoteCache: S3RemoteCache,

      SequencerStartupModule,
    }),

    Signer: InMemorySigner,
    TransactionSender: InMemoryTransactionSender,
    QueryTransportModule: StateServiceQueryModule,
    NetworkStateTransportModule: BlockStorageNetworkStateModule,
    BlockExplorerTransportModule: InMemoryBlockExplorer,
  });

  appChain.configure({
    Runtime: {
      Balances: {},
    },

    Protocol: {
      ...Protocol.defaultConfig(),
      TransactionFee: {
        tokenId: 0n,
        feeRecipient: PrivateKey.random().toPublicKey().toBase58(),
        baseFee: 0n,
        methods: {},
        perWeightUnitFee: 0n,
      },
    },

    Sequencer: {
      SequencerStartupModule: {},
      Database: {},

      Mempool: {},
      BatchProducerModule: {},
      LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
      BaseLayer: {},
      TaskQueue: {},

      BlockProducerModule: {
        allowEmptyBlock: true,
      },

      BlockTrigger: {},

      RemoteCache: {
        client: {
          endPoint: "localhost",
          port: 9000,
          useSSL: false,
          accessKey: "minioadmin",
          secretKey: "minioadmin",
        },
        bucketName: "caching-stack-test",
      },
    },

    TransactionSender: {},
    QueryTransportModule: {},
    NetworkStateTransportModule: {},

    Signer: {
      signer: PrivateKey.random(),
    },
    BlockExplorerTransportModule: {},
  });

  await appChain.start(true, container.createChildContainer());

  return appChain;
}

function clearCache() {
  fs.rmSync(cachedir("o1js"), { force: true, recursive: true });
  fs.mkdirSync(cachedir("o1js"));
}

// This test is convered by workers-proven.test.ts
describe.skip("caching stack test", () => {
  let appchain: Awaited<ReturnType<typeof startAppChain>>;

  beforeAll(async () => {
    log.setLevel("DEBUG");
    clearCache();
    appchain = await startAppChain();
  }, 500000);

  afterAll(async () => {
    await appchain.close();
  });

  it("should have compiled and pushed to cache", async () => {
    const cache = appchain.sequencer.resolve("RemoteCache");

    const blockProverObjects = await cache.getObjects("blockprover");
    expect(blockProverObjects.length).toBe(6);

    const srsObjects = await cache.getObjects("srs");
    expect(srsObjects.length).toBeGreaterThan(8);
  }, 500000);
});
