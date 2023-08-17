import { RuntimeModulesRecord } from "@proto-kit/module";
import { AppChain, Query, TestingAppChain } from "@proto-kit/sdk";
import { PrivateKey } from "snarkyjs";
import { Balance, Balances, BalancesKey, TokenId } from "./Balances";
import { XYK } from "./XYK";

type Modules = {
  Balances: typeof Balances;
  XYK: typeof XYK;
};

describe("xyk", () => {
  const aliceKey = PrivateKey.random();
  const alice = aliceKey.toPublicKey();

  const tokenAId = TokenId.from(0);
  const tokenBId = TokenId.from(1);

  let chain: TestingAppChain<Modules>;

  let balances: Balances;
  let xyk: XYK;

  beforeAll(async () => {
    chain = TestingAppChain.fromRuntime({
      modules: {
        Balances,
        XYK,
      },
      config: {
        Balances: {},
        XYK: {},
      },
    });

    chain.setSigner(aliceKey);

    await chain.start();

    balances = chain.runtime.resolve("Balances");
    xyk = chain.runtime.resolve("XYK");
  });

  it("should mint balance for alice", async () => {
    const balanceToMint = 10_000n;
    const tx1 = chain.transaction(alice, () => {
      balances.mint(tokenAId, alice, Balance.from(balanceToMint));
    });

    await tx1.sign();
    await tx1.send();

    await chain.produceBlock();

    const tx2 = chain.transaction(alice, () => {
      balances.mint(tokenBId, alice, Balance.from(balanceToMint));
    });

    await tx2.sign();
    await tx2.send();

    await chain.produceBlock();

    const balanceA = await chain.query.Balances.balances.get(
      new BalancesKey({
        tokenId: tokenAId,
        address: alice,
      })
    );

    const balanceB = await chain.query.Balances.balances.get(
      new BalancesKey({
        tokenId: tokenBId,
        address: alice,
      })
    );

    expect(balanceA?.toBigInt()).toBe(balanceToMint);
    expect(balanceB?.toBigInt()).toBe(balanceToMint);
  }, 120000);

  it("should create a pool", async () => {
    const liquidityA = 2000n;
    const liquidityB = 4000n;

    const tx = chain.transaction(alice, () => {
      xyk.cpc(
        tokenAId,
        tokenBId,
        Balance.from(liquidityA),
        Balance.from(liquidityB)
      );
    });

    await tx.sign();
    await tx.send();

    await chain.produceBlock();
  }, 260000);
});