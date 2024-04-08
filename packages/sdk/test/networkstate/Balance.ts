import {
  Balance,
  Balances,
  BalancesKey,
  TokenId,
  UInt64,
} from "@proto-kit/library";
import {
  runtimeMethod,
  runtimeModule,
  RuntimeModule,
  state,
} from "@proto-kit/module";
import { log, Presets, range } from "@proto-kit/common";
import { Bool, Field, PublicKey, Struct, Provable, Signature } from "o1js";
import { Admin } from "@proto-kit/module/test/modules/Admin";
import { Option, State, StateMap, assert } from "@proto-kit/protocol";

class MyStruct extends Struct({
  a: Provable.Array(Field, 10),
}) {}

@runtimeModule()
export class BalanceChild extends Balances {
  public static presets = {} satisfies Presets<object>;

  @state() public totalSupply = State.from<UInt64>(UInt64);

  public constructor(public admin: Admin) {
    super();
  }

  @runtimeMethod()
  public addBalanceToSelf(value: UInt64, blockHeight: UInt64) {
    const address = this.transaction.sender.value;
    const balancesKey = new BalancesKey({
      tokenId: TokenId.from(0),
      address,
    });
    const balance = this.balances.get(balancesKey);

    log.provable.debug("Sender:", address);
    log.provable.debug("Balance:", balance.isSome, balance.value);
    log.provable.debug("BlockHeight:", this.network.block.height);

    assert(blockHeight.equals(UInt64.from(this.network.block.height)));

    const newBalance = balance.value.add(value);
    this.balances.set(balancesKey, newBalance);
  }

  @runtimeMethod()
  public lotOfSTs() {
    range(0, 10).forEach((index) => {
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      const pk = PublicKey.from({ x: Field(index % 5), isOdd: Bool(false) });
      const balancesKey = new BalancesKey({
        address: pk,
        tokenId: TokenId.from(0),
      });
      const value = this.balances.get(balancesKey);
      this.balances.set(balancesKey, value.orElse(UInt64.zero).add(100));

      const supply = this.totalSupply.get().orElse(UInt64.zero);
      this.totalSupply.set(supply.add(UInt64.from(100)));
    });
  }

  @runtimeMethod()
  public assertLastBlockHash(hash: Field) {
    const lastRootHash = this.network.previous.rootHash;
    assert(hash.equals(lastRootHash), `Root hash not matching`);
  }

  @runtimeMethod()
  public getBalance(tokenId: TokenId, address: PublicKey): Balance {
    return super.getBalance(tokenId, address);
  }

  @runtimeMethod()
  public setBalance(tokenId: TokenId, address: PublicKey, amount: Balance) {
    super.setBalance(tokenId, address, amount);
  }
}
