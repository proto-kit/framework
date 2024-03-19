import {
  RuntimeModule,
  runtimeModule,
  state,
  runtimeMethod,
} from "@proto-kit/module";
import { Provable, PublicKey, Struct, UInt64 } from "o1js";
import { State, StateMap, assert } from "@proto-kit/protocol";
import { Balance, Balances, TokenId } from "@proto-kit/library";

interface BalancesConfig {
  totalSupply: UInt64;
}

@runtimeModule()
export class TestBalances extends Balances<BalancesConfig> {
  @state() public circulatingSupply = State.from<UInt64>(UInt64);

  @runtimeMethod()
  public setBalance(tokenId: TokenId, address: PublicKey, amount: Balance) {
    super.setBalance(tokenId, address, amount);
  }
}
