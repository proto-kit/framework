import "reflect-metadata";
import { Field, PrivateKey, PublicKey, UInt64 } from "o1js";
import {
  Runtime,
  runtimeMethod,
  RuntimeModule,
  runtimeModule,
  state,
} from "@proto-kit/module";
import {
  AccountStateModule,
  Option,
  State,
  StateMap,
  VanillaProtocol,
} from "@proto-kit/protocol";
import { Presets, log, sleep } from "@proto-kit/common";
import {
  AsyncStateService,
  BlockProducerModule,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  NoopBaseLayer,
  PendingTransaction,
  PrivateMempool,
  Sequencer,
  TimedBlockTrigger,
  UnsignedTransaction
} from "@proto-kit/sequencer";
import {
  BlockStorageResolver,
  GraphqlSequencerModule,
  GraphqlServer,
  MempoolResolver,
  NodeStatusResolver,
  QueryGraphqlModule
} from "@proto-kit/api";

import { AppChain } from "../../src/appChain/AppChain";
import { StateServiceQueryModule } from "../../src/query/StateServiceQueryModule";
import { InMemorySigner } from "../../src/transaction/InMemorySigner";
import { InMemoryTransactionSender } from "../../src/transaction/InMemoryTransactionSender";
import { container } from "tsyringe";
import {
  UnprovenProducerModule
} from "@proto-kit/sequencer/dist/protocol/production/unproven/UnprovenProducerModule";

log.setLevel(log.levels.INFO);

function createNewTx() {
  const pk = PrivateKey.random();

  const tx = new UnsignedTransaction({
    nonce: UInt64.zero,
    args: [Field(1)],
    methodId: Field(1),
    sender: pk.toPublicKey(),
  }).sign(pk);

  console.log(tx.toJSON());
}
createNewTx();

@runtimeModule()
export class Balances extends RuntimeModule<object> {
  /**
   * We use `satisfies` here in order to be able to access
   * presets by key in a type safe way.
   */
  public static presets = {} satisfies Presets<object>;

  @state() public balances = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  @state() public totalSupply = State.from<UInt64>(UInt64);

  @runtimeMethod()
  public getBalance(address: PublicKey): Option<UInt64> {
    return this.balances.get(address);
  }

  @runtimeMethod()
  public addBalance(address: PublicKey, balance: UInt64) {
    const totalSupply = this.totalSupply.get()
    this.totalSupply.set(totalSupply.orElse(UInt64.zero).add(balance));

    const previous = this.balances.get(address)
    this.balances.set(address, previous.orElse(UInt64.zero).add(balance));
  }
}

export async function startServer() {

  log.setLevel("DEBUG")

  const appChain = AppChain.from({
    runtime: Runtime.from({
      modules: {
        Balances,
      },

      config: {
        Balances: {},
      },
    }),

    protocol: VanillaProtocol.from(
      { AccountStateModule },
      { AccountStateModule: {}, StateTransitionProver: {}, BlockProver: {} }
    ),

    sequencer: Sequencer.from({
      modules: {
        Mempool: PrivateMempool,
        GraphqlServer,
        LocalTaskWorkerModule,
        BaseLayer: NoopBaseLayer,
        BlockProducerModule,
        UnprovenProducerModule,
        BlockTrigger: TimedBlockTrigger,
        TaskQueue: LocalTaskQueue,

        Graphql: GraphqlSequencerModule.from({
          modules: {
            MempoolResolver,
            QueryGraphqlModule,
            BlockStorageResolver,
            NodeStatusResolver,
          },

          config: {
            MempoolResolver: {},
            QueryGraphqlModule: {},
            BlockStorageResolver: {},
            NodeStatusResolver: {},
          },
        }),
      },
    }),

    modules: {
      Signer: InMemorySigner,
      TransactionSender: InMemoryTransactionSender,
      QueryTransportModule: StateServiceQueryModule,
    },
  });

  appChain.configure({
    Runtime: {
      Balances: {},
    },

    Protocol: {
      BlockProver: {},
      StateTransitionProver: {},
      AccountStateModule: {},
    },

    Sequencer: {
      GraphqlServer: {
        port: 8080,
        host: "0.0.0.0",
        graphiql: true
      },

      Graphql: {
        QueryGraphqlModule: {},
        MempoolResolver: {},
        BlockStorageResolver: {},
        NodeStatusResolver: {}
      },

      Mempool: {},
      BlockProducerModule: {},
      LocalTaskWorkerModule: {},
      BaseLayer: {},
      TaskQueue: {},
      UnprovenProducerModule: {},

      BlockTrigger: {
        blockInterval: 5000,
        settlementInterval: 15000,
      },
    },

    TransactionSender: {},
    QueryTransportModule: {},

    Signer: {
      signer: PrivateKey.random(),
    },
  });

  await appChain.start(container.createChildContainer());
  const pk = PublicKey.fromBase58(
    "B62qmETai5Y8vvrmWSU8F4NX7pTyPqYLMhc1pgX3wD8dGc2wbCWUcqP"
  );
  console.log(pk.toJSON());

  const balances = appChain.runtime.resolve("Balances");

  const priv = PrivateKey.fromBase58(
    "EKFEMDTUV2VJwcGmCwNKde3iE1cbu7MHhzBqTmBtGAd6PdsLTifY"
  );

  const priv2 = PrivateKey.random();

  const tx2 = appChain.transaction(priv2.toPublicKey(), () => {
    balances.addBalance(priv2.toPublicKey(), UInt64.from(1000))
  })
  appChain.resolve("Signer").config.signer = priv2
  await tx2.sign();
  await tx2.send();

  const tx = appChain.transaction(priv.toPublicKey(), () => {
    balances.addBalance(priv.toPublicKey(), UInt64.from(1000))
  })
  appChain.resolve("Signer").config.signer = priv
  await tx.sign();
  await tx.send();
  // console.log((tx.transaction as PendingTransaction).toJSON())

  console.log("Path:", balances.balances.getPath(pk).toString());

  // const asyncState =
  //   appChain.sequencer.dependencyContainer.resolve<AsyncStateService>(
  //     "AsyncStateService"
  //   );
  // await asyncState.setAsync(balances.balances.getPath(pk), [Field(100)]);
  // await asyncState.setAsync(balances.totalSupply.path!, [Field(10_000)]);

  // appChain.query.runtime.Balances.totalSupply

  // await sleep(30000);

  return appChain
}

// await startServer();