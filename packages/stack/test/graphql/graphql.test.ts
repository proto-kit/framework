import "reflect-metadata";
import { Runtime } from "@proto-kit/module";
import { Protocol, ReturnType } from "@proto-kit/protocol";
import {
  BalancesKey,
  TokenId,
  VanillaProtocolModules,
  VanillaRuntimeModules,
  UInt64,
} from "@proto-kit/library";
import { Field, PrivateKey } from "o1js";
import { sleep } from "@proto-kit/common";
import { ManualBlockTrigger, Sequencer } from "@proto-kit/sequencer";
import { GraphqlServer } from "@proto-kit/api";
import {
  AppChain,
  InMemorySigner,
  GraphqlTransactionSender,
  GraphqlQueryTransportModule,
  GraphqlClient,
  GraphqlNetworkStateTransportModule,
} from "@proto-kit/sdk";
import { beforeAll } from "@jest/globals";

import { startServer, TestBalances } from "../../src/scripts/graphql/server";

const pk = PrivateKey.random();

function prepareClient() {
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
      modules: {},
    }),

    modules: {
      Signer: InMemorySigner,
      TransactionSender: GraphqlTransactionSender,
      QueryTransportModule: GraphqlQueryTransportModule,
      NetworkStateTransportModule: GraphqlNetworkStateTransportModule,
      GraphqlClient,
    },
  });

  appChain.configurePartial({
    Runtime: {
      Balances: {},
    },

    Protocol: {
      AccountState: {},
      BlockProver: {},
      StateTransitionProver: {},
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

describe("graphql client test", () => {
  let appChain: ReturnType<typeof prepareClient>;
  let server: Awaited<ReturnType<typeof startServer>>;
  let trigger: ManualBlockTrigger;
  const tokenId = TokenId.from(0);

  beforeAll(async () => {
    server = await startServer();

    await sleep(2000);

    appChain = prepareClient();

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

    const tx = await appChain.transaction(pk.toPublicKey(), async () => {
      await appChain.runtime
        .resolve("Balances")
        .addBalance(tokenId, pk.toPublicKey(), UInt64.from(1000));
    });
    await tx.sign();
    await tx.send();

    await trigger.produceUnproven();

    const balance = await appChain.query.runtime.Balances.balances.get(
      new BalancesKey({
        tokenId,
        address: pk.toPublicKey(),
      })
    );

    expect(balance?.toBigInt()).toBe(1000n);
  }, 60_000);

  it("should fetch networkstate correctly", async () => {
    expect.assertions(2);

    const state = await appChain.query.network.unproven;

    expect(state).toBeDefined();
    expect(state!.block.height.toBigInt()).toBeGreaterThanOrEqual(0n);
  });

  it("should retrieve merkle witness", async () => {
    expect.assertions(2);

    const witness =
      await appChain!.query.runtime.Balances.balances.merkleWitness(
        new BalancesKey({
          tokenId: TokenId.from(0),
          address: pk.toPublicKey(),
        })
      );

    expect(witness).toBeDefined();
    // Check if this works, i.e. if it correctly parsed
    expect(witness!.calculateRoot(Field(0)).toBigInt()).toBeGreaterThanOrEqual(
      0n
    );
  });
});
