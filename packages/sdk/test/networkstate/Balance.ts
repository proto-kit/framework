import {
  Balance,
  Balances,
  BalancesKey,
  TokenId,
  UInt64,
} from "@proto-kit/library";
import { runtimeMethod, runtimeModule, state } from "@proto-kit/module";
import { log, Presets, range, mapSequential } from "@proto-kit/common";
import { Bool, Field, PublicKey } from "o1js";
import { Admin } from "@proto-kit/module/test/modules/Admin";
import { State, assert } from "@proto-kit/protocol";

@runtimeModule()
export class BalanceChild extends Balances {
  public static presets = {} satisfies Presets<object>;

  @state() public totalSupply = State.from<UInt64>(UInt64);

  public constructor(public admin: Admin) {
    super();
  }

  @runtimeMethod()
  public async addBalanceToSelf(value: UInt64, blockHeight: UInt64) {
    const address = this.transaction.sender.value;
    const balancesKey = new BalancesKey({
      tokenId: TokenId.from(0),
      address,
    });
    const balance = await this.balances.get(balancesKey);

    log.provable.debug("Sender:", address);
    log.provable.debug("Balance:", balance.isSome, balance.value);
    log.provable.debug("BlockHeight:", this.network.block.height);

    assert(
      blockHeight.equals(
        UInt64.Unsafe.fromField(this.network.block.height.value)
      )
    );

    const newBalance = balance.value.add(value);
    await this.balances.set(balancesKey, newBalance);
  }

  @runtimeMethod()
  public async lotOfSTs() {
    await mapSequential(range(0, 10), async (index) => {
      const pk = PublicKey.from({ x: Field(index % 5), isOdd: Bool(false) });
      const balancesKey = new BalancesKey({
        address: pk,
        tokenId: TokenId.from(0),
      });
      const value = await this.balances.get(balancesKey);
      await this.balances.set(balancesKey, value.orElse(UInt64.zero).add(100));

      const supply = (await this.totalSupply.get()).orElse(UInt64.zero);
      await this.totalSupply.set(supply.add(UInt64.from(100)));
    });
  }

  @runtimeMethod()
  public async assertLastBlockHash(hash: Field) {
    const lastRootHash = this.network.previous.rootHash;
    assert(hash.equals(lastRootHash), "Root hash not matching");
  }

  @runtimeMethod()
  public getUserBalance(
    tokenId: TokenId,
    address: PublicKey
  ): Promise<Balance> {
    return super.getBalance(tokenId, address);
  }

  @runtimeMethod()
  public async setBalance(
    tokenId: TokenId,
    address: PublicKey,
    amount: Balance
  ) {
    await super.setBalance(tokenId, address, amount);
  }
}
