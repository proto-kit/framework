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
import {
  ManualBlockTrigger,
  Sequencer,
  InclusionStatus,
} from "@proto-kit/sequencer";
import {
  ClientAppChain,
  InMemorySigner,
  GraphqlTransactionSender,
  GraphqlQueryTransportModule,
  GraphqlClient,
  GraphqlNetworkStateTransportModule,
  GraphqlBlockExplorerTransportModule,
} from "@proto-kit/sdk";
import { beforeAll } from "@jest/globals";
import { container } from "tsyringe";

import { startGraphqlServer } from "./graphql-server";
import { TestBalances } from "./utils";

const pk = PrivateKey.random();

function prepareClient() {
  const appChain = ClientAppChain.from({
    Runtime: Runtime.from(
      VanillaRuntimeModules.with({
        Balances: TestBalances,
      })
    ),

    Protocol: Protocol.from(VanillaProtocolModules.with({})),

    Sequencer: Sequencer.from({}),

    Signer: InMemorySigner,
    TransactionSender: GraphqlTransactionSender,
    QueryTransportModule: GraphqlQueryTransportModule,
    NetworkStateTransportModule: GraphqlNetworkStateTransportModule,
    BlockExplorerTransportModule: GraphqlBlockExplorerTransportModule,
    GraphqlClient,
  });

  appChain.configurePartial({
    Runtime: {
      Balances: {},
    },

    Protocol: {
      ...Protocol.defaultConfig(),
      TransactionFee: {
        tokenId: 0n,
        feeRecipient: PrivateKey.random().toPublicKey().toBase58(),
        baseFee: 0n,
        methods: {},
        perWeightUnitFee: 0n,
      },
    },

    Sequencer: {},

    TransactionSender: {},
    QueryTransportModule: {},
    NetworkStateTransportModule: {},

    GraphqlClient: {
      url: "http://127.0.0.1:8080/graphql",
    },

    BlockExplorerTransportModule: {},

    Signer: {
      signer: pk,
    },
  });

  return appChain;
}

describe("graphql client test", () => {
  let appChain: ReturnType<typeof prepareClient>;
  let server: Awaited<ReturnType<typeof startGraphqlServer>>;
  let trigger: ManualBlockTrigger;
  const tokenId = TokenId.from(0);

  beforeAll(async () => {
    server = await startGraphqlServer();

    await sleep(2000);

    appChain = prepareClient();

    await appChain.start(false, container.createChildContainer());

    trigger = server.sequencer.resolveOrFail(
      "BlockTrigger",
      ManualBlockTrigger
    );
    await trigger.produceBlock();
  }, 20_000);

  afterAll(async () => {
    await appChain.close();
    await server.sequencer.close();
  }, 20_000);

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

    await trigger.produceBlock();

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
    expect(
      witness!.merkleWitness.calculateRoot(Field(0)).toBigInt()
    ).toBeGreaterThanOrEqual(0n);
  });

  it("should wait for transaction inclusion", async () => {
    expect.assertions(2);

    const tx = await appChain.transaction(pk.toPublicKey(), async () => {
      await appChain.runtime
        .resolve("Balances")
        .addBalance(tokenId, pk.toPublicKey(), UInt64.from(1000));
    });
    await tx.sign();
    await tx.send();

    const txHash = tx.transaction?.hash().toString()!;

    const waitPromise = appChain.query.explorer.fetchTxInclusion(txHash);

    let resolved = false;
    void waitPromise.then(() => {
      resolved = true;
    });

    // See that promise is not resolved since block is not triggered.
    expect(resolved).toBe(false);

    // Produce block - this should trigger resolution
    await trigger.produceBlock();

    // Now it should resolve
    const postBlockQuery = await waitPromise;
    expect(postBlockQuery.transactionState).toBe(InclusionStatus.INCLUDED);
  }, 20_000);

  it("should get block with block hash or block height", async () => {
    expect.assertions(6);

    const tx = await appChain.transaction(pk.toPublicKey(), async () => {
      await appChain.runtime
        .resolve("Balances")
        .addBalance(tokenId, pk.toPublicKey(), UInt64.from(1000));
    });

    await tx.sign();
    await tx.send();

    const block = await trigger.produceBlock();
    const hash = block?.hash.toString()!;
    const height = Number(block?.height.toBigInt());

    const hashResult = await appChain.query.explorer.getBlock({ hash: hash });
    const heightResult = await appChain.query.explorer.getBlock({
      height: height,
    });

    const heightParsedTx = heightResult?.transactions!;

    const blockTxHash = block?.transactions[0].tx.toJSON().hash;

    const queryTxHash = heightParsedTx[0]?.tx?.hash;

    // Transaction hashes should match
    expect(blockTxHash).toBe(queryTxHash);

    // Block hashes should match
    expect(block?.hash.toBigInt()).toBe(heightResult?.hash.toBigInt());

    // Block heights should match
    expect(block?.height.toBigInt()).toBe(heightResult?.height.toBigInt());

    // Previous block hashes should match
    expect(block?.previousBlockHash?.toBigInt()).toBe(
      heightResult?.previousBlockHash?.toBigInt()
    );

    // Transaction hashes should match
    expect(block?.transactionsHash.toBigInt()).toBe(
      heightResult?.transactionsHash.toBigInt()
    );

    // Both query methods should return the same result
    expect(hashResult).toEqual(heightResult);
  }, 10_000);
});
