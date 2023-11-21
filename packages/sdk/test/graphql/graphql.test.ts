import "reflect-metadata";
import { Field, PrivateKey, UInt64 } from "o1js";
import {
  Runtime,
} from "@proto-kit/module";
import {
  AccountStateModule,
  ReturnType,
  VanillaProtocol,
} from "@proto-kit/protocol";
import { log, sleep } from "@proto-kit/common";
import {
  PrivateMempool,
  QueryTransportModule,
  Sequencer,
} from "@proto-kit/sequencer";

import { startServer, Balances } from "./graphql";
import { beforeAll } from "@jest/globals";
import {
  AppChain,
  InMemorySigner,
} from "../../src";
import { GraphqlTransactionSender } from "../../src/graphql/GraphqlTransactionSender";
import { GraphqlQueryTransportModule } from "../../src/graphql/GraphqlQueryTransportModule";
import { GraphqlClient } from "../../src/graphql/GraphqlClient";
import { container } from "tsyringe";

log.setLevel(log.levels.INFO);

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

    console.log(totalSupply.toString());
  }, 60000);

  it("should send transaction", async () => {
    const tx = await appChain!.transaction(pk.toPublicKey(), () => {
      appChain!.runtime
        .resolve("Balances")
        .setBalance(pk.toPublicKey(), UInt64.from(1000));
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

  it.only("should retrieve merkle witness", async () => {
    expect.assertions(2);

    const witness = await appChain!.query.runtime.Balances.balances.merkleWitness(pk.toPublicKey())

    expect(witness).toBeDefined();
    // Check if this works, i.e. if it correctly parsed
    expect(witness!.calculateRoot(Field(0)).toBigInt()).toBeGreaterThanOrEqual(0n)
  })
});
