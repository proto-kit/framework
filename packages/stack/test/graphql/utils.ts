import { PublicKey } from "o1js";
import { runtimeMethod, runtimeModule } from "@proto-kit/module";
import { State, state } from "@proto-kit/protocol";
import {
  Balance,
  Balances,
  BalancesKey,
  TokenId,
  UInt64,
} from "@proto-kit/library";


@runtimeModule()
export class TestBalances extends Balances {
  /**
   * We use `satisfies` here in order to be able to access
   * presets by key in a type safe way.
   */
  // public static presets = {} satisfies Presets<object>;

  @state() public totalSupply = State.from<UInt64>(UInt64);

  @runtimeMethod()
  public async getBalanceForUser(
    tokenId: TokenId,
    address: PublicKey
  ): Promise<Balance> {
    return await super.getBalance(tokenId, address);
  }

  @runtimeMethod()
  public async addBalance(
    tokenId: TokenId,
    address: PublicKey,
    balance: UInt64
  ) {
    const totalSupply = await this.totalSupply.get();
    await this.totalSupply.set(totalSupply.orElse(UInt64.zero).add(balance));

    const previous = await this.balances.get(
      new BalancesKey({ tokenId, address })
    );
    await this.balances.set(
      new BalancesKey({ tokenId, address }),
      previous.orElse(UInt64.zero).add(balance)
    );
  }
}
