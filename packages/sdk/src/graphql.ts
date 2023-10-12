import "reflect-metadata";
import { Field, PrivateKey, PublicKey, UInt64 } from "snarkyjs";
import {
  InMemoryStateService,
  Runtime,
  runtimeMethod,
  RuntimeModule,
  runtimeModule, RuntimeModulesRecord,
  state
} from "@proto-kit/module";
import { AccountStateModule, Option, State, StateMap, VanillaProtocol } from "@proto-kit/protocol";
import { Presets, log } from "@proto-kit/common";
import {
  AsyncStateService,
  GraphqlSequencerModule, GraphqlServer, MempoolResolver,
  PrivateMempool, QueryGraphqlModule,
  Sequencer,
  UnsignedTransaction,
  BlockStorageResolver
} from "@proto-kit/sequencer";
import { AppChain } from "./appChain/AppChain";
import { StateServiceQueryModule } from "./query/StateServiceQueryModule";
import { InMemorySigner } from "./transaction/InMemorySigner";
import { InMemoryTransactionSender } from "./transaction/InMemoryTransactionSender";

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

const stateservice = new InMemoryStateService()

const appChain = AppChain.from({
  runtime: Runtime.from({
    modules: {
      Balances,
    },
    state: stateservice,

    config: {
      Balances: {},
    },
  }),

  protocol: VanillaProtocol.from({ AccountStateModule }, stateservice),

  sequencer: Sequencer.from({
    modules: {
      Mempool: PrivateMempool,
      GraphqlServer,

      Graphql: GraphqlSequencerModule.from({
        modules: {
          MempoolResolver,
          QueryGraphqlModule,
          BlockStorageResolver
        },

        config: {
          MempoolResolver: {},
          QueryGraphqlModule: {},
          BlockStorageResolver: {}
        },
      }),
    },
  }),
  modules: {
    Signer: InMemorySigner,
    TransactionSender: InMemoryTransactionSender,
    QueryTransportModule: StateServiceQueryModule,
  }
})

appChain.configure({
  Runtime: {
    Balances: {}
  },
  Protocol: {
    BlockProver: {},
    StateTransitionProver: {},
    AccountStateModule: {}
  },
  Sequencer: {
    GraphqlServer: {
      port: 8080,
      host: "0.0.0.0",
    },

    Graphql: {
      QueryGraphqlModule: {},
      MempoolResolver: {},
      BlockStorageResolver: {}
    },
    Mempool: {},
  },
  TransactionSender: {},
  QueryTransportModule: {},
  Signer: {
    signer: PrivateKey.random()
  }
})

await appChain.start();

const pk = PublicKey.fromBase58("B62qmETai5Y8vvrmWSU8F4NX7pTyPqYLMhc1pgX3wD8dGc2wbCWUcqP");
console.log(pk.toJSON());

const gql = appChain.sequencer.resolve("Graphql").resolve("BlockStorageResolver")

const balances = appChain.runtime.resolve("Balances");

console.log("Path:", balances.balances.getPath(pk).toString());

const asyncState = appChain.sequencer.dependencyContainer.resolve<AsyncStateService>("AsyncStateService")
await asyncState.setAsync(balances.balances.getPath(pk), [Field(100)])
await asyncState.setAsync(balances.totalSupply.path!, [Field(10000)])