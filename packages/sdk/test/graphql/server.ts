import "reflect-metadata";
import { CircuitString, Field, PrivateKey, PublicKey, UInt64 } from "o1js";
import {
  Runtime,
  runtimeMethod,
  RuntimeModule,
  runtimeModule,
  state,
} from "@proto-kit/module";
import {
  AccountStateModule,
  BlockHeightHook,
  Option,
  State,
  StateMap,
  VanillaProtocol,
} from "@proto-kit/protocol";
import { Presets, log, sleep } from "@proto-kit/common";
import {
  AsyncStateService,
  BlockProducerModule,
  InMemoryDatabase,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PendingTransaction,
  PrivateMempool, QueryBuilderFactory,
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
  UnprovenBlockResolver,
} from "@proto-kit/api";

import { AppChain } from "../../src/appChain/AppChain";
import { StateServiceQueryModule } from "../../src/query/StateServiceQueryModule";
import { InMemorySigner } from "../../src/transaction/InMemorySigner";
import { InMemoryTransactionSender } from "../../src/transaction/InMemoryTransactionSender";
import { container } from "tsyringe";
import { UnprovenProducerModule } from "@proto-kit/sequencer/dist/protocol/production/unproven/UnprovenProducerModule";
import { BlockStorageNetworkStateModule } from "../../src/query/BlockStorageNetworkStateModule";
import { MessageBoard, Post } from "./Post";

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
    const totalSupply = this.totalSupply.get();
    this.totalSupply.set(totalSupply.orElse(UInt64.zero).add(balance));

    const previous = this.balances.get(address);
    this.balances.set(address, previous.orElse(UInt64.zero).add(balance));
  }
}

export async function startServer() {
  log.setLevel("DEBUG");

  const appChain = AppChain.from({
    runtime: Runtime.from({
      modules: {
        Balances,
        MessageBoard,
      },

      config: {
        Balances: {},
        MessageBoard: {},
      },
    }),

    protocol: VanillaProtocol.from({ }),

    sequencer: Sequencer.from({
      modules: {
        Database: InMemoryDatabase,
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
      MessageBoard: {},
    },

    Protocol: {
      BlockProver: {},
      StateTransitionProver: {},
      AccountState: {},
      BlockHeight: {},
      LastStateRoot: {}
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
        UnprovenBlockResolver: {},
        MerkleWitnessResolver: {},
      },

      Database: {},
      Mempool: {},
      BlockProducerModule: {},
      LocalTaskWorkerModule: {},
      BaseLayer: {},
      TaskQueue: {},

      UnprovenProducerModule: {
        allowEmptyBlock: true,
      },

      BlockTrigger: {
        blockInterval: 15000,
        settlementInterval: 30000,
      },
    },

    TransactionSender: {},
    QueryTransportModule: {},
    NetworkStateTransportModule: {},

    Signer: {
      signer: PrivateKey.random(),
    },
  });

  await appChain.start(container.createChildContainer());
  const pk = PublicKey.fromBase58(
    "B62qmETai5Y8vvrmWSU8F4NX7pTyPqYLMhc1pgX3wD8dGc2wbCWUcqP"
  );

  const balances = appChain.runtime.resolve("Balances");

  const priv = PrivateKey.fromBase58(
    "EKFEMDTUV2VJwcGmCwNKde3iE1cbu7MHhzBqTmBtGAd6PdsLTifY"
  );

  const tx = await appChain.transaction(priv.toPublicKey(), () => {
    balances.addBalance(priv.toPublicKey(), UInt64.from(1000));
  });
  appChain.resolve("Signer").config.signer = priv;
  await tx.sign();
  await tx.send();

  const tx2 = await appChain.transaction(
    priv.toPublicKey(),
    () => {
      balances.addBalance(priv.toPublicKey(), UInt64.from(1000));
    },
    { nonce: 1 }
  );
  await tx2.sign();
  await tx2.send();

  return appChain;
}
