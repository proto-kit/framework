import {
  AppChain,
  BlockStorageNetworkStateModule,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "@proto-kit/sdk";
import { PrivateKey, PublicKey } from "o1js";
import { Runtime, runtimeMethod, runtimeModule } from "@proto-kit/module";
import { Protocol, State, state } from "@proto-kit/protocol";
import {
  Balance,
  Balances,
  BalancesKey,
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
  MerkleWitnessResolver,
  NodeStatusResolver,
  QueryGraphqlModule,
  BlockResolver,
  OpenTelemetryServer,
} from "@proto-kit/api";
import { container } from "tsyringe";

@runtimeModule()
export class TestBalances extends Balances {
  /**
   * We use `satisfies` here in order to be able to access
   * presets by key in a type safe way.
   */
  // public static presets = {} satisfies Presets<object>;

  @state() public totalSupply = State.from<UInt64>(UInt64);

  @runtimeMethod()
  public async getBalanceForUser(
    tokenId: TokenId,
    address: PublicKey
  ): Promise<Balance> {
    return await super.getBalance(tokenId, address);
  }

  @runtimeMethod()
  public async addBalance(
    tokenId: TokenId,
    address: PublicKey,
    balance: UInt64
  ) {
    const totalSupply = await this.totalSupply.get();
    await this.totalSupply.set(totalSupply.orElse(UInt64.zero).add(balance));

    const previous = await this.balances.get(
      new BalancesKey({ tokenId, address })
    );
    await this.balances.set(
      new BalancesKey({ tokenId, address }),
      previous.orElse(UInt64.zero).add(balance)
    );
  }
}

export async function startServer() {
  log.setLevel("DEBUG");

  const appChain = AppChain.from({
    Runtime: Runtime.from({
      modules: VanillaRuntimeModules.with({
        Balances: TestBalances,
      }),
    }),

    Protocol: Protocol.from({
      modules: VanillaProtocolModules.with({}),
    }),

    Sequencer: Sequencer.from({
      modules: {
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
          modules: {
            MempoolResolver,
            QueryGraphqlModule,
            BatchStorageResolver,
            BlockResolver,
            NodeStatusResolver,
            MerkleWitnessResolver,
          },

          config: {
            MempoolResolver: {},
            QueryGraphqlModule: {},
            BatchStorageResolver: {},
            NodeStatusResolver: {},
            MerkleWitnessResolver: {},
            BlockResolver: {},
          },
        }),

        SequencerStartupModule,
      },
    }),

    modules: {
      Signer: InMemorySigner,
      TransactionSender: InMemoryTransactionSender,
      QueryTransportModule: StateServiceQueryModule,
      NetworkStateTransportModule: BlockStorageNetworkStateModule,
    },
  });

  appChain.configure({
    Runtime: {
      Balances: {},
    },

    Protocol: {
      BlockProver: {},
      StateTransitionProver: {},
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
