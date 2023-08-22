import "reflect-metadata";
import {
  RuntimeModule,
  StateMap,
  runtimeMethod,
  state,
  runtimeModule,
} from "@proto-kit/module";
import { Field, Group, Poseidon, PublicKey, Token } from "snarkyjs";
import { Balance, Balances, TokenId } from "./Balances";
import assert from "assert";
import { inject } from "tsyringe";

export const errors = {
  poolExists: () => "Pool already exists",
  assetsMatch: () => "Cannot create pool with matching assets",
  tokenOutAmountTooLow: () => "Token out amount too low",
};

export class LPTokenId extends TokenId {
  public static fromTokenIdPair(tokenIdA: TokenId, tokenIdB: TokenId): TokenId {
    return TokenId.from(Poseidon.hash([tokenIdA, tokenIdB]));
  }
}

export class PoolKey extends PublicKey {
  public static fromTokenIdPair(tokenIdA: TokenId, tokenIdB: TokenId): PoolKey {
    const {
      x,
      y: { x0 },
    } = Poseidon.hashToGroup([tokenIdA, tokenIdB]);

    return PoolKey.fromGroup(Group.fromFields([x, x0]));
  }
}

@runtimeModule()
export class XYK extends RuntimeModule<unknown> {
  public static defaultPoolValue = Field(0);
  @state() public pools = StateMap.from<PoolKey, Field>(PoolKey, Field);

  public constructor(@inject("Balances") public balances: Balances) {
    super();
  }

  public poolExists(tokenIdA: TokenId, tokenIdB: TokenId) {
    const key = PoolKey.fromTokenIdPair(tokenIdA, tokenIdB);
    const reversedKey = PoolKey.fromTokenIdPair(tokenIdA, tokenIdB);
    const pool = this.pools.get(key);
    const reversedPool = this.pools.get(reversedKey);

    return pool.isSome.or(reversedPool.isSome);
  }

  public assertPoolExists(tokenIdA: TokenId, tokenIdB: TokenId) {
    assert(this.poolExists(tokenIdA, tokenIdB), errors.poolExists());
  }

  public createPool(tokenIdA: TokenId, tokenIdB: TokenId) {
    const key = PoolKey.fromTokenIdPair(tokenIdA, tokenIdB);
    this.pools.set(key, XYK.defaultPoolValue);
  }

  // createPoolChecked
  @runtimeMethod()
  public cpc(
    tokenIdA: TokenId,
    tokenIdB: TokenId,
    tokenAAmount: Balance,
    tokenBAmount: Balance
  ) {
    assert(tokenIdA.equals(tokenIdB).not(), errors.assetsMatch());
    assert(this.poolExists(tokenIdA, tokenIdB).not(), errors.poolExists());

    this.createPool(tokenIdA, tokenIdB);

    const creator = this.transaction.sender;
    const pool = PoolKey.fromTokenIdPair(tokenIdA, tokenIdB);

    this.balances.transfer(tokenIdA, creator, pool, tokenAAmount);
    this.balances.transfer(tokenIdB, creator, pool, tokenBAmount);

    // mint LP token
    const lpTokenId = LPTokenId.fromTokenIdPair(tokenIdA, tokenIdB);
    this.balances.mint(lpTokenId, creator, tokenAAmount);
  }

  public calculateTokenBAmountOut(
    tokenIdA: TokenId,
    tokenIdB: TokenId,
    tokenAAmountIn: Balance
  ) {
    const pool = PoolKey.fromTokenIdPair(tokenIdA, tokenIdB);

    const tokenAReserve = this.balances.getBalance(tokenIdA, pool);
    // 1000
    const tokenBReserve = this.balances.getBalance(tokenIdB, pool);

    // 1010
    const denominator = tokenAReserve.add(tokenAAmountIn);
    // 1000 * 10 = 10_000
    const numerator = tokenBReserve.mul(tokenAAmountIn);

    // 10
    const tokenBAmountOut = numerator.div(denominator);

    return tokenBAmountOut;
  }

  @runtimeMethod()
  public sell(
    tokenIdA: TokenId,
    tokenIdB: TokenId,
    // 10
    tokenAAmountIn: Balance,
    minTokenBAmountOut: Balance
  ) {
    this.assertPoolExists(tokenIdA, tokenIdB);
    const pool = PoolKey.fromTokenIdPair(tokenIdA, tokenIdB);

    const tokenBAmountOut = this.calculateTokenBAmountOut(
      tokenIdA,
      tokenIdB,
      tokenAAmountIn
    );

    const isTokenOutAmountTooLow = tokenBAmountOut.lessThan(minTokenBAmountOut);

    assert(isTokenOutAmountTooLow, errors.tokenOutAmountTooLow());

    this.balances.transfer(
      tokenIdA,
      this.transaction.sender,
      pool,
      tokenAAmountIn
    );

    this.balances.transfer(
      tokenIdB,
      pool,
      this.transaction.sender,
      tokenBAmountOut
    );
  }
}