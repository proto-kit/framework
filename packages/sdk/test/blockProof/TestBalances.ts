import { runtimeModule, state, runtimeMethod } from "@proto-kit/module";
import { PublicKey } from "o1js";
import { State } from "@proto-kit/protocol";
import { Balance, Balances, TokenId, UInt64 } from "@proto-kit/library";

interface BalancesConfig {
  totalSupply: UInt64;
}

@runtimeModule()
export class TestBalances extends Balances<BalancesConfig> {
  @state() public circulatingSupply = State.from<UInt64>(UInt64);

  @runtimeMethod()
  public async setBalance(
    tokenId: TokenId,
    address: PublicKey,
    amount: Balance
  ) {
    super.setBalance(tokenId, address, amount);
  }
}
