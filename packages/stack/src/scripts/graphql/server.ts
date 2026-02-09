import {
  BlockStorageNetworkStateModule,
  ClientAppChain,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "@proto-kit/sdk";
import { PrivateKey } from "o1js";
import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
import {
  TokenId,
  VanillaProtocolModules,
  VanillaRuntimeModules,
  UInt64,
} from "@proto-kit/library";
import { log, mapSequential, range } from "@proto-kit/common";
import {
  BatchProducerModule,
  InMemoryDatabase,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  NoopBaseLayer,
  PrivateMempool,
  Sequencer,
  BlockProducerModule,
  VanillaTaskWorkerModules,
  SequencerStartupModule,
  TimedBlockTrigger,
} from "@proto-kit/sequencer";
import {
  BatchStorageResolver,
  GraphqlSequencerModule,
  GraphqlServer,
  MempoolResolver,
  LinkedMerkleWitnessResolver as MerkleWitnessResolver,
  NodeStatusResolver,
  QueryGraphqlModule,
  BlockResolver,
  OpenTelemetryServer,
} from "@proto-kit/api";
import { container } from "tsyringe";

import { TestBalances } from "../../helpers/TestBalance";

export async function startServer() {
  log.setLevel("DEBUG");

  const appChain = ClientAppChain.from({
    Runtime: Runtime.from(
      VanillaRuntimeModules.with({
        Balances: TestBalances,
      })
    ),

    Protocol: Protocol.from(VanillaProtocolModules.with({})),

    Sequencer: Sequencer.from({
      Database: InMemoryDatabase,
      // Database: PrismaRedisDatabase,
      OpenTelemetryServer,

      Mempool: PrivateMempool,
      GraphqlServer,
      LocalTaskWorkerModule: LocalTaskWorkerModule.from(
        VanillaTaskWorkerModules.withoutSettlement()
      ),

      BaseLayer: NoopBaseLayer,
      BatchProducerModule,
      BlockProducerModule,
      // BlockTrigger: ManualBlockTrigger,
      BlockTrigger: TimedBlockTrigger,
      TaskQueue: LocalTaskQueue,
      // SettlementModule: SettlementModule,

      Graphql: GraphqlSequencerModule.from({
        MempoolResolver,
        QueryGraphqlModule,
        BatchStorageResolver,
        BlockResolver,
        NodeStatusResolver,
        MerkleWitnessResolver,
      }),

      SequencerStartupModule,
    }),
    Signer: InMemorySigner,
    TransactionSender: InMemoryTransactionSender,
    QueryTransportModule: StateServiceQueryModule,
    NetworkStateTransportModule: BlockStorageNetworkStateModule,
  });

  appChain.configure({
    Runtime: {
      Balances: {},
    },

    Protocol: {
      BlockProver: {},
      StateTransitionProver: {},
      TransactionProver: {},
      AccountState: {},
      BlockHeight: {},
      TransactionFee: {
        tokenId: 0n,
        feeRecipient: PrivateKey.random().toPublicKey().toBase58(),
        baseFee: 0n,
        methods: {},
        perWeightUnitFee: 0n,
      },
      LastStateRoot: {},
    },

    Sequencer: {
      GraphqlServer: {
        port: 8080,
        host: "0.0.0.0",
        graphiql: true,
      },
      SequencerStartupModule: {},

      // SettlementModule: {
      //   address: PrivateKey.random().toPublicKey(),
      //   feepayer: PrivateKey.random(),
      // },

      Graphql: {
        QueryGraphqlModule: {},
        MempoolResolver: {},
        BatchStorageResolver: {},
        NodeStatusResolver: {},
        BlockResolver: {},
        MerkleWitnessResolver: {},
      },

      OpenTelemetryServer: {
        tracing: {
          enabled: true,
          otlp: {
            url: "http://localhost:4318",
          },
        },
        metrics: {
          enabled: true,
        },
      },

      Database: {
        // redis: {
        //   host: "localhost",
        //   port: 6379,
        //   password: "password",
        // },
        // prisma: {
        //   connection: {
        //     host: "localhost",
        //     password: "password",
        //     username: "user",
        //     port: 5432,
        //     db: {
        //       name: "protokit",
        //     },
        //   },
        // },
      },

      Mempool: {},
      BatchProducerModule: {},
      LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
      BaseLayer: {},
      TaskQueue: {},

      BlockProducerModule: {
        allowEmptyBlock: true,
      },

      BlockTrigger: {
        blockInterval: 10000,
        settlementInterval: 20000,
        settlementTokenConfig: {},
      },
    },

    TransactionSender: {},
    QueryTransportModule: {},
    NetworkStateTransportModule: {},

    Signer: {
      signer: PrivateKey.random(),
    },
  });

  await appChain.start(false, container.createChildContainer());
  // const pk = PublicKey.fromBase58(
  //   "B62qmETai5Y8vvrmWSU8F4NX7pTyPqYLMhc1pgX3wD8dGc2wbCWUcqP"
  // );

  const balances = appChain.runtime.resolve("Balances");

  const priv = PrivateKey.fromBase58(
    "EKFEMDTUV2VJwcGmCwNKde3iE1cbu7MHhzBqTmBtGAd6PdsLTifY"
  );

  const tokenId = TokenId.from(0);

  const as = await appChain.query.protocol.AccountState.accountState.get(
    priv.toPublicKey()
  );
  let nonce = Number(as?.nonce.toString() ?? "0");

  setInterval(async () => {
    const random = Math.floor(Math.random() * 5);
    await mapSequential(range(0, random), async () => {
      const tx = await appChain.transaction(
        priv.toPublicKey(),
        async () => {
          await balances.addBalance(
            tokenId,
            priv.toPublicKey(),
            UInt64.from(1000)
          );
        },
        {
          nonce,
        }
      );
      appChain.resolve("Signer").config.signer = priv;
      await tx.sign();
      await tx.send();

      nonce += 1;
    });
  }, 10000);

  return appChain;
}
