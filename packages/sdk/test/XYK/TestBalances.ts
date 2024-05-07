import { Balance, Balances, TokenId } from "@proto-kit/library";
import { runtimeMethod, runtimeModule } from "@proto-kit/module";
import { PublicKey } from "o1js";

@runtimeModule()
export class TestBalances extends Balances {
  @runtimeMethod()
  public async mint(tokenId: TokenId, address: PublicKey, amount: Balance) {
    const balance = this.getBalance(tokenId, address);
    const newBalance = balance.add(amount);
    this.setBalance(tokenId, address, newBalance);
  }
}
