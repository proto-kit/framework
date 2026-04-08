import {
  ClientAppChain,
  BlockStorageNetworkStateModule,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
  InMemoryBlockExplorer,
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
import { log } from "@proto-kit/common";
import {
  BatchProducerModule,
  InMemoryDatabase,
  LocalTaskQueue,
  WorkerModule,
  NoopBaseLayer,
  PrivateMempool,
  Sequencer,
  BlockProducerModule,
  VanillaTaskWorkerModules,
  SequencerStartupModule,
  ManualBlockTrigger,
} from "@proto-kit/sequencer";
import {
  BatchStorageResolver,
  GraphqlSequencerModule,
  MempoolResolver,
  MerkleWitnessResolver,
  NodeStatusResolver,
  QueryGraphqlModule,
  BlockResolver,
} from "@proto-kit/api";
import { container } from "tsyringe";

import { TestBalances } from "./utils";

export async function startGraphqlServer() {
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

      Mempool: PrivateMempool,
      WorkerModule: WorkerModule.from(
        VanillaTaskWorkerModules.withoutSettlement()
      ),

      BaseLayer: NoopBaseLayer,
      BatchProducerModule,
      BlockProducerModule,
      BlockTrigger: ManualBlockTrigger,
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

      // SettlementModule: {
      //   address: PrivateKey.random().toPublicKey(),
      //   feepayer: PrivateKey.random(),
      // },

      Graphql: {
        containerConfig: {
          port: 8080,
          host: "0.0.0.0",
          graphiql: true,
        },
        QueryGraphqlModule: {},
        MempoolResolver: {},
        BatchStorageResolver: {},
        NodeStatusResolver: {},
        BlockResolver: {},
        MerkleWitnessResolver: {},
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
      WorkerModule: VanillaTaskWorkerModules.defaultConfig(),
      BaseLayer: {},
      TaskQueue: {},

      BlockProducerModule: {},

      BlockTrigger: {},
    },

    TransactionSender: {},
    QueryTransportModule: {},
    NetworkStateTransportModule: {},

    Signer: {
      signer: PrivateKey.random(),
    },
    BlockExplorerTransportModule: {},
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
  const nonce = Number(as?.nonce.toString() ?? "0");

  const tx = await appChain.transaction(
    priv.toPublicKey(),
    async () => {
      await balances.addBalance(tokenId, priv.toPublicKey(), UInt64.from(1000));
    },
    {
      nonce,
    }
  );
  appChain.resolve("Signer").config.signer = priv;
  await tx.sign();
  await tx.send();

  const tx2 = await appChain.transaction(
    priv.toPublicKey(),
    async () => {
      await balances.addBalance(tokenId, priv.toPublicKey(), UInt64.from(1000));
    },
    { nonce: nonce + 1 }
  );
  await tx2.sign();
  await tx2.send();

  return appChain;
}
