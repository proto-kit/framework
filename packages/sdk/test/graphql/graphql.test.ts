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
  ReturnType,
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
  PrivateMempool,
  QueryTransportModule,
  Sequencer,
  TimedBlockTrigger,
  UnsignedTransaction,
} from "@proto-kit/sequencer";
import {
  BlockStorageResolver,
  GraphqlSequencerModule,
  GraphqlServer,
  MempoolResolver,
  NodeStatusResolver,
  QueryGraphqlModule,
} from "@proto-kit/api";

import { startServer, Balances } from "./graphql";
import { beforeAll } from "@jest/globals";
import {
  AppChain,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "../../src";
import { GraphqlTransactionSender } from "../../src/graphql/GraphqlTransactionSender";
import { GraphqlQueryTransportModule } from "../../src/graphql/GraphqlQueryTransportModule";
import { GraphqlClient } from "../../src/graphql/GraphqlClient";
import { container } from "tsyringe";
import {
  GraphqlNetworkStateTransportModule
} from "../../src/graphql/GraphqlNetworkStateTransportModule";

log.setLevel(log.levels.INFO);

const pk = PrivateKey.random();

function createNewTx(methodId: Field) {
  const tx = new UnsignedTransaction({
    nonce: UInt64.zero,
    args: pk.toPublicKey().toFields(),
    methodId,
    sender: pk.toPublicKey(),
  }).sign(pk);

  console.log(tx.toJSON());

  return tx;
}

function prepare() {
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
      },
    }),

    modules: {
      Signer: InMemorySigner,
      TransactionSender: GraphqlTransactionSender,
      QueryTransportModule: GraphqlQueryTransportModule,
      NetworkStateTransportModule: GraphqlNetworkStateTransportModule,
      GraphqlClient,
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
      Mempool: {},
    },

    TransactionSender: {},
    QueryTransportModule: {},
    NetworkStateTransportModule: {},

    GraphqlClient: {
      url: "http://127.0.0.1:8080/graphql",
    },

    Signer: {
      signer: pk,
    },
  });

  return appChain;
}

describe("graphql client test", function () {
  let appChain: ReturnType<typeof prepare> | undefined = undefined;

  beforeAll(async () => {
    const server = await startServer();

    await sleep(2000);

    appChain = prepare();

    await appChain.start(container.createChildContainer());
  });

  it("should retrieve state", async () => {
    const result = await appChain!
      .resolve("QueryTransportModule")
      .get(Field(1234));
    console.log(`Result: ${result?.toString()}`);

    const totalSupply =
      await appChain!.query.runtime.Balances.totalSupply.get();

    console.log(totalSupply!.toString());
  }, 60000);

  it("should send transaction", async () => {
    const tx = await appChain!.transaction(pk.toPublicKey(), () => {
      appChain!.runtime
        .resolve("Balances")
        .addBalance(pk.toPublicKey(), UInt64.from(1000));
    });
    await tx.sign();
    await tx.send();

    await sleep(10000);

    const balance = await appChain!.query.runtime.Balances.balances.get(
      pk.toPublicKey()
    );

    expect(balance).toBeDefined();
    expect(balance!.toBigInt()).toBe(1000n);
  }, 60000);

  it.only("should fetch networkstate correctly", async () => {
    expect.assertions(2);

    const state = await appChain!.query.network.unproven;

    expect(state).toBeDefined();
    expect(state.block.height.toBigInt()).toBeGreaterThanOrEqual(0n);
  });
});
