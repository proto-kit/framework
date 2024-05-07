import {
  AppChain,
  BlockStorageNetworkStateModule,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "@proto-kit/sdk";
import { PrivateKey, PublicKey } from "o1js";
import {
  Runtime,
  runtimeMethod,
  runtimeModule,
  state,
} from "@proto-kit/module";
import { Protocol, State } from "@proto-kit/protocol";
import {
  Balance,
  Balances,
  BalancesKey,
  TokenId,
  VanillaProtocolModules,
  VanillaRuntimeModules,
  UInt64,
} from "@proto-kit/library";
import { log } from "@proto-kit/common";
import {
  BlockProducerModule,
  InMemoryDatabase,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  Sequencer,
  UnprovenProducerModule,
  VanillaTaskWorkerModules,
} from "@proto-kit/sequencer";
import {
  BlockStorageResolver,
  GraphqlSequencerModule,
  GraphqlServer,
  MempoolResolver,
  MerkleWitnessResolver,
  NodeStatusResolver,
  QueryGraphqlModule,
  UnprovenBlockResolver,
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
    return super.getBalance(tokenId, address);
  }

  @runtimeMethod()
  public async addBalance(
    tokenId: TokenId,
    address: PublicKey,
    balance: UInt64
  ) {
    const totalSupply = this.totalSupply.get();
    this.totalSupply.set(totalSupply.orElse(UInt64.zero).add(balance));

    const previous = this.balances.get(new BalancesKey({ tokenId, address }));
    this.balances.set(
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

        Mempool: PrivateMempool,
        GraphqlServer,
        LocalTaskWorkerModule: LocalTaskWorkerModule.from(
          VanillaTaskWorkerModules.withoutSettlement()
        ),
        BaseLayer: NoopBaseLayer,
        BlockProducerModule,
        UnprovenProducerModule,
        BlockTrigger: ManualBlockTrigger,
        TaskQueue: LocalTaskQueue,
        // SettlementModule: SettlementModule,

        Graphql: GraphqlSequencerModule.from({
          modules: {
            MempoolResolver,
            QueryGraphqlModule,
            BlockStorageResolver,
            UnprovenBlockResolver,
            NodeStatusResolver,
            MerkleWitnessResolver,
          },

          config: {
            MempoolResolver: {},
            QueryGraphqlModule: {},
            BlockStorageResolver: {},
            NodeStatusResolver: {},
            MerkleWitnessResolver: {},
            UnprovenBlockResolver: {},
          },
        }),
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
      // SettlementModule: {
      //   address: PrivateKey.random().toPublicKey(),
      //   feepayer: PrivateKey.random(),
      // },

      Graphql: {
        QueryGraphqlModule: {},
        MempoolResolver: {},
        BlockStorageResolver: {},
        NodeStatusResolver: {},
        UnprovenBlockResolver: {},
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
      BlockProducerModule: {},
      LocalTaskWorkerModule: {
        StateTransitionTask: {},
        // SettlementProvingTask: {},
        BlockBuildingTask: {},
        BlockProvingTask: {},
        BlockReductionTask: {},
        RuntimeProvingTask: {},
        StateTransitionReductionTask: {},
      },
      BaseLayer: {},
      TaskQueue: {},

      UnprovenProducerModule: {
        allowEmptyBlock: true,
      },

      BlockTrigger: {},
    },

    TransactionSender: {},
    QueryTransportModule: {},
    NetworkStateTransportModule: {},

    Signer: {
      signer: PrivateKey.random(),
    },
  });

  await appChain.start(container.createChildContainer());
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
