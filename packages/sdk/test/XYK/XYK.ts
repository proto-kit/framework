import "reflect-metadata";
import {
  RuntimeModule,
  runtimeMethod,
  state,
  runtimeModule,
} from "@proto-kit/module";
import { StateMap, assert } from "@proto-kit/protocol";
import { Field, Poseidon, PublicKey, Provable, Struct } from "o1js";
import { inject } from "tsyringe";
import { Balance, Balances, TokenId } from "@proto-kit/library";

export const errors = {
  poolExists: () => "Pool already exists",
  tokensMatch: () => "Cannot create pool with matching tokens",
  tokenOutAmountTooLow: () => "Token out amount too low",
  tokenInAmountTooHigh: () => "Token in amount too high",
};

export class TokenPair extends Struct({
  tokenIdIn: TokenId,
  tokenIdOut: TokenId,
}) {
  public static from(tokenIdIn: TokenId, tokenIdOut: TokenId) {
    return Provable.if(
      tokenIdIn.greaterThan(tokenIdOut),
      TokenPair,
      new TokenPair({ tokenIdIn, tokenIdOut }),
      new TokenPair({ tokenIdIn: tokenIdOut, tokenIdOut: tokenIdIn })
    );
  }
}

export class LPTokenId extends TokenId {
  public static fromTokenIdPair(
    tokenIdIn: TokenId,
    tokenIdOut: TokenId
  ): TokenId {
    return TokenId.from(
      Poseidon.hash(TokenPair.toFields(TokenPair.from(tokenIdIn, tokenIdOut)))
    );
  }
}

export class PoolKey extends PublicKey {
  public static fromTokenIdPair(
    tokenIdIn: TokenId,
    tokenIdOut: TokenId
  ): PoolKey {
    const tokenPair = TokenPair.from(tokenIdIn, tokenIdOut);

    const group = Poseidon.hashToGroup(TokenPair.toFields(tokenPair));

    return PoolKey.fromGroup(group);
  }
}

@runtimeModule()
export class XYK extends RuntimeModule<Record<never, never>> {
  public static defaultPoolValue = Field(0);

  @state() public pools = StateMap.from<PoolKey, Field>(PoolKey, Field);

  public constructor(@inject("Balances") public balances: Balances) {
    super();
  }

  public poolExists(tokenIdIn: TokenId, tokenIdOut: TokenId) {
    const key = PoolKey.fromTokenIdPair(tokenIdIn, tokenIdOut);
    const pool = this.pools.get(key);

    return pool.isSome;
  }

  public assertPoolExists(tokenIdIn: TokenId, tokenIdOut: TokenId) {
    assert(this.poolExists(tokenIdIn, tokenIdOut), errors.poolExists());
  }

  @runtimeMethod()
  public async createPool(
    tokenIdIn: TokenId,
    tokenIdOut: TokenId,
    tokenInAmount: Balance,
    tokenOutAmount: Balance
  ) {
    assert(tokenIdIn.equals(tokenIdOut).not(), errors.tokensMatch());
    assert(this.poolExists(tokenIdIn, tokenIdOut).not(), errors.poolExists());

    const key = PoolKey.fromTokenIdPair(tokenIdIn, tokenIdOut);
    this.pools.set(key, XYK.defaultPoolValue);

    const creator = this.transaction.sender.value;
    const pool = PoolKey.fromTokenIdPair(tokenIdIn, tokenIdOut);

    this.balances.transfer(tokenIdIn, creator, pool, tokenInAmount);
    this.balances.transfer(tokenIdOut, creator, pool, tokenOutAmount);

    // mint LP token
    const lpTokenId = LPTokenId.fromTokenIdPair(tokenIdIn, tokenIdOut);
    this.balances.mint(lpTokenId, creator, tokenInAmount);
  }

  public calculateTokenOutAmountOut(
    tokenIdIn: TokenId,
    tokenIdOut: TokenId,
    tokenInAmountIn: Balance
  ) {
    const pool = PoolKey.fromTokenIdPair(tokenIdIn, tokenIdOut);

    const tokenInReserve = this.balances.getBalance(tokenIdIn, pool);
    const tokenOutReserve = this.balances.getBalance(tokenIdOut, pool);

    return this.calculateTokenOutAmountOutFromReserves(
      tokenInReserve,
      tokenOutReserve,
      tokenInAmountIn
    );
  }

  public calculateTokenOutAmountOutFromReserves(
    tokenInReserve: Balance,
    tokenOutReserve: Balance,
    tokenInAmountIn: Balance
  ) {
    const numerator = tokenOutReserve.mul(tokenInAmountIn);
    const denominator = tokenInReserve.add(tokenInAmountIn);

    return numerator.div(denominator);
  }

  public calculateTokenInAmountIn(
    tokenIdIn: TokenId,
    tokenIdOut: TokenId,
    tokenOutAmountOut: Balance
  ) {
    const pool = PoolKey.fromTokenIdPair(tokenIdIn, tokenIdOut);

    const tokenInReserve = this.balances.getBalance(tokenIdIn, pool);
    const tokenOutReserve = this.balances.getBalance(tokenIdOut, pool);
    return this.calculateTokenInAmountInFromReserves(
      tokenInReserve,
      tokenOutReserve,
      tokenOutAmountOut
    );
  }

  public calculateTokenInAmountInFromReserves(
    tokenInReserve: Balance,
    tokenOutReserve: Balance,
    tokenOutAmountOut: Balance
  ) {
    const paddedTokenOutReserve = tokenOutReserve.add(tokenOutAmountOut);
    const tokenOutReserveIsSufficient =
      tokenOutReserve.greaterThanOrEqual(tokenOutAmountOut);

    const safeTokenOutReserve = Provable.if<Balance>(
      tokenOutReserveIsSufficient,
      Balance,
      tokenOutReserve,
      paddedTokenOutReserve
    );

    const numerator = tokenInReserve.mul(tokenOutAmountOut);

    const denominator = safeTokenOutReserve.sub(tokenOutAmountOut);

    const denominatorIsSafe = denominator.greaterThan(Balance.from(0));
    const safeDenominator = Provable.if<Balance>(
      denominatorIsSafe,
      Balance,
      denominator,
      Balance.from(1)
    );

    assert(denominatorIsSafe);

    return numerator.div(safeDenominator);
  }

  @runtimeMethod()
  public async sell(
    tokenIdIn: TokenId,
    tokenIdOut: TokenId,
    tokenInAmountIn: Balance,
    minTokenOutAmountOut: Balance
  ) {
    this.assertPoolExists(tokenIdIn, tokenIdOut);
    const pool = PoolKey.fromTokenIdPair(tokenIdIn, tokenIdOut);

    const tokenOutAmountOut = this.calculateTokenOutAmountOut(
      tokenIdIn,
      tokenIdOut,
      tokenInAmountIn
    );

    const isTokenOutAmountTooLow =
      tokenOutAmountOut.greaterThanOrEqual(minTokenOutAmountOut);

    Provable.log("tokenOutAmountOut", {
      tokenOutAmountOut,
      minTokenOutAmountOut,
    });

    assert(isTokenOutAmountTooLow, errors.tokenOutAmountTooLow());

    this.balances.transfer(
      tokenIdIn,
      this.transaction.sender.value,
      pool,
      tokenInAmountIn
    );

    this.balances.transfer(
      tokenIdOut,
      pool,
      this.transaction.sender.value,
      tokenOutAmountOut
    );
  }

  @runtimeMethod()
  public async buy(
    tokenIdIn: TokenId,
    tokenIdOut: TokenId,
    tokenOutAmountOut: Balance,
    maxTokenInAmountIn: Balance
  ) {
    this.assertPoolExists(tokenIdIn, tokenIdOut);
    const pool = PoolKey.fromTokenIdPair(tokenIdIn, tokenIdOut);

    const tokenInAmountIn = this.calculateTokenInAmountIn(
      tokenIdIn,
      tokenIdOut,
      tokenOutAmountOut
    );

    const isTokenInInAmountTooHigh =
      tokenInAmountIn.lessThanOrEqual(maxTokenInAmountIn);

    Provable.log("tokenInAmountIn", {
      tokenInAmountIn,
      maxTokenInAmountIn,
    });

    assert(isTokenInInAmountTooHigh, errors.tokenInAmountTooHigh());

    this.balances.transfer(
      tokenIdOut,
      pool,
      this.transaction.sender.value,
      tokenOutAmountOut
    );

    this.balances.transfer(
      tokenIdIn,
      this.transaction.sender.value,
      pool,
      tokenInAmountIn
    );
  }
}
