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
import { Presets, log } from "@proto-kit/common";
import {
  AsyncStateService,
  BlockProducerModule,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  NoopBaseLayer,
  PrivateMempool,
  Sequencer,
  TimedBlockTrigger,
  UnsignedTransaction,
} from "@proto-kit/sequencer";
import {
  BlockStorageResolver,
  GraphqlSequencerModule,
  GraphqlServer,
  MempoolResolver,
  MerkleWitnessResolver,
  NodeStatusResolver,
  QueryGraphqlModule,
} from "@proto-kit/api";

import { AppChain } from "../../src/appChain/AppChain";
import { StateServiceQueryModule } from "../../src/query/StateServiceQueryModule";
import { InMemorySigner } from "../../src/transaction/InMemorySigner";
import { InMemoryTransactionSender } from "../../src/transaction/InMemoryTransactionSender";
import { container } from "tsyringe";

log.setLevel(log.levels.INFO);

@runtimeModule()
export class Balances extends RuntimeModule<object> {
  @state() public balances = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  @state() public totalSupply = State.from(UInt64);

  @runtimeMethod()
  public getBalance(address: PublicKey): Option<UInt64> {
    return this.balances.get(address);
  }

  @runtimeMethod()
  public setBalance(address: PublicKey, balance: UInt64) {
    this.balances.set(address, balance);
  }
}

export async function startServer() {
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
      { AccountState: AccountStateModule },
      { AccountState: {}, StateTransitionProver: {}, BlockProver: {} }
    ),

    sequencer: Sequencer.from({
      modules: {
        Mempool: PrivateMempool,
        GraphqlServer,
        LocalTaskWorkerModule,
        BaseLayer: NoopBaseLayer,
        BlockProducerModule,
        BlockTrigger: TimedBlockTrigger,
        TaskQueue: LocalTaskQueue,

        Graphql: GraphqlSequencerModule.from({
          modules: {
            MempoolResolver,
            QueryGraphqlModule,
            BlockStorageResolver,
            NodeStatusResolver,
            MerkleWitnessResolver,
          },

          config: {
            MempoolResolver: {},
            QueryGraphqlModule: {},
            BlockStorageResolver: {},
            NodeStatusResolver: {},
            MerkleWitnessResolver: {},
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
      AccountState: {},
    },

    Sequencer: {
      GraphqlServer: {
        port: 8080,
        host: "0.0.0.0",
        graphiql: true,
      },

      Graphql: {
        QueryGraphqlModule: {},
        MempoolResolver: {},
        BlockStorageResolver: {},
        NodeStatusResolver: {},
        MerkleWitnessResolver: {},
      },

      Mempool: {},
      BlockProducerModule: {},
      LocalTaskWorkerModule: {},
      BaseLayer: {},
      TaskQueue: {},

      BlockTrigger: {
        blocktime: 5000,
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

  console.log("Path:", balances.balances.getPath(pk).toString());

  const asyncState =
    appChain.sequencer.dependencyContainer.resolve<AsyncStateService>(
      "AsyncStateService"
    );
  await asyncState.setAsync(balances.balances.getPath(pk), [Field(100)]);
  await asyncState.setAsync(balances.totalSupply.path!, [Field(10_000)]);

  return appChain;
}

// await startServer();
