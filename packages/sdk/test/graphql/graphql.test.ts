import "reflect-metadata";
import { Field, PrivateKey, PublicKey, UInt64 } from "o1js";
import {
  MethodIdResolver,
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
  ManualBlockTrigger,
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

import { startServer, Balances } from "./server";
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
import { GraphqlNetworkStateTransportModule } from "../../src/graphql/GraphqlNetworkStateTransportModule";

const pk = PrivateKey.random();

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

    protocol: VanillaProtocol.from({}),

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
      AccountState: {},
      BlockProver: {},
      StateTransitionProver: {},
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
  let appChain: ReturnType<typeof prepare>;
  let server: Awaited<ReturnType<typeof startServer>>;
  let trigger: ManualBlockTrigger;

  beforeAll(async () => {
    server = await startServer();

    await sleep(2000);

    appChain = prepare();

    await appChain.start();

    trigger = server.sequencer.resolveOrFail(
      "BlockTrigger",
      ManualBlockTrigger
    );
    await trigger.produceUnproven();
  });

  afterAll(async () => {
    server.sequencer.resolveOrFail("GraphqlServer", GraphqlServer).close();
  });

  it("should retrieve state", async () => {
    expect.assertions(1);

    const totalSupply = await appChain.query.runtime.Balances.totalSupply.get();

    expect(totalSupply?.toString()).toBe("2000");
  }, 60_000);

  it("should send transaction", async () => {
    expect.assertions(1);

    const tx = await appChain.transaction(pk.toPublicKey(), () => {
      appChain.runtime
        .resolve("Balances")
        .addBalance(pk.toPublicKey(), UInt64.from(1000));
    });
    await tx.sign();
    await tx.send();

    await trigger.produceUnproven();

    const balance = await appChain.query.runtime.Balances.balances.get(
      pk.toPublicKey()
    );

    expect(balance?.toBigInt()).toBe(1000n);
  }, 60_000);

  it("should fetch networkstate correctly", async () => {
    expect.assertions(1);

    const state = await appChain.query.network.unproven;

    expect(state.block.height.toBigInt()).toBeGreaterThanOrEqual(0n);
  });
});
