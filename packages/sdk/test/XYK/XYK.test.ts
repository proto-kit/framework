import "reflect-metadata";
import { Balance, BalancesKey, TokenId } from "@proto-kit/library";
import { PrivateKey, Provable, PublicKey } from "o1js";

import { TestingAppChain } from "../../src/appChain/TestingAppChain";

import { TestBalances } from "./TestBalances";
import { PoolKey, XYK } from "./XYK";

type RuntimeModules = {
  Balances: typeof TestBalances;
  XYK: typeof XYK;
};

// TODO This test passes locally, but fails in the CI because of untracable
// TypeError: Do not know how to serialize a BigInt
describe("xyk", () => {
  const aliceKey = PrivateKey.fromBase58(
    "EKFEMDTUV2VJwcGmCwNKde3iE1cbu7MHhzBqTmBtGAd6PdsLTifY"
  );
  const alice = aliceKey.toPublicKey();

  const tokenInId = TokenId.from(0);
  const tokenOutId = TokenId.from(1);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const pool = PoolKey.fromTokenIdPair(tokenInId, tokenOutId);

  let chain: ReturnType<typeof TestingAppChain.fromRuntime<RuntimeModules>>;

  let balances: TestBalances;
  let xyk: XYK;

  const balanceToMint = 10_000n;
  const initialLiquidityA = 1000n;
  const initialLiquidityB = 2000n;

  const balanceToSell = 100n;
  const balanceToBuy = 200n;

  async function getBalance(tokenId: TokenId, address: PublicKey) {
    return await chain.query.runtime.Balances.balances.get(
      new BalancesKey({
        tokenId,
        address,
      })
    );
  }

  beforeAll(async () => {
    chain = TestingAppChain.fromRuntime({
      Balances: TestBalances,
      XYK,
    });

    chain.configurePartial({
      Runtime: {
        Balances: {},
        XYK: {},
      },
    });

    await chain.start();

    chain.setSigner(aliceKey);

    balances = chain.runtime.resolve("Balances");
    xyk = chain.runtime.resolve("XYK");
  }, 30_000);

  it("should mint balance for alice", async () => {
    expect.assertions(2);

    const tx1 = await chain.transaction(alice, async () => {
      await balances.mint(tokenInId, alice, Balance.from(balanceToMint));
    });

    await tx1.sign();
    await tx1.send();

    await chain.produceBlock();

    const tx2 = await chain.transaction(alice, async () => {
      await balances.mint(tokenOutId, alice, Balance.from(balanceToMint));
    });

    await tx2.sign();
    await tx2.send();

    await chain.produceBlock();

    const balanceIn = await getBalance(tokenInId, alice);
    const balanceOut = await getBalance(tokenOutId, alice);

    expect(balanceIn?.toBigInt()).toBe(balanceToMint);
    expect(balanceOut?.toBigInt()).toBe(balanceToMint);
  }, 30_000);

  it("should create a pool", async () => {
    expect.assertions(2);

    const tx = await chain.transaction(alice, async () => {
      await xyk.createPool(
        tokenInId,
        tokenOutId,
        Balance.from(initialLiquidityA),
        Balance.from(initialLiquidityB)
      );
    });

    await tx.sign();
    await tx.send();

    await chain.produceBlock();

    const balanceIn = await getBalance(tokenInId, alice);
    const balanceOut = await getBalance(tokenOutId, alice);

    expect(balanceIn?.toString()).toBe(
      String(balanceToMint - initialLiquidityA)
    );
    expect(balanceOut?.toString()).toBe(
      String(balanceToMint - initialLiquidityB)
    );
  }, 30_000);

  it("should sell tokenIn", async () => {
    expect.assertions(2);

    const balanceInBefore = await getBalance(tokenInId, alice);
    const balanceOutBefore = await getBalance(tokenOutId, alice);

    const tx = await chain.transaction(alice, async () => {
      await xyk.sell(
        tokenInId,
        tokenOutId,
        Balance.from(balanceToSell),
        Balance.from(100n)
      );
    });

    await tx.sign();
    await tx.send();

    await chain.produceBlock();

    const balanceInAfter = await getBalance(tokenInId, alice);
    const balanceOutAfter = await getBalance(tokenOutId, alice);

    Provable.log("Sell balances", {
      balanceInBefore,
      balanceInAfter,
      balanceOutBefore,
      balanceOutAfter,
    });

    expect(balanceInAfter?.toString()).toBe(
      String(balanceInBefore!.toBigInt() - balanceToSell)
    );

    expect(balanceOutAfter?.toString()).toBe(
      // 181 = expected calculated amount to receive

      String(balanceOutBefore!.toBigInt() + 181n)
    );
  }, 30_000);

  it("should buy tokenOut", async () => {
    expect.assertions(2);

    const balanceInBefore = await getBalance(tokenInId, alice);
    const balanceOutBefore = await getBalance(tokenOutId, alice);

    const tx = await chain.transaction(alice, async () => {
      await xyk.buy(
        tokenInId,
        tokenOutId,
        Balance.from(balanceToBuy),
        Balance.from(10_000n)
      );
    });

    await tx.sign();
    await tx.send();

    await chain.produceBlock();

    const balanceInAfter = await getBalance(tokenInId, alice);
    const balanceOutAfter = await getBalance(tokenOutId, alice);

    expect(balanceOutAfter?.toString()).toBe(
      String(balanceOutBefore!.toBigInt() + balanceToBuy)
    );

    expect(balanceInAfter?.toString()).toBe(
      // 404 = expected calculated amount in

      String(balanceInBefore!.toBigInt() - 135n)
    );
  }, 30_000);
});
