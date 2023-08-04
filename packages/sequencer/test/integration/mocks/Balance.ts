import {
  assert,
  runtimeMethod,
  runtimeModule,
  RuntimeModule,
  state,
  State,
  StateMap
} from "@yab/module";
import { Presets } from "@yab/common";
import { Bool, Provable, PublicKey, UInt64 } from "snarkyjs";
import { Admin } from "@yab/module/test/modules/Admin";
import { Option } from "@yab/protocol";

@runtimeModule()
export class Balance extends RuntimeModule<object> {
  public static presets = {} satisfies Presets<object>;

  @state() public totalSupply = State.from<UInt64>(UInt64);

  @state() public balances = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  public constructor(public admin: Admin) {
    super();
  }

  @runtimeMethod()
  public getTotalSupply() {
    this.totalSupply.get();
  }

  @runtimeMethod()
  public setTotalSupply() {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    this.totalSupply.set(UInt64.from(20));
    this.admin.isAdmin(PublicKey.empty());
  }

  @runtimeMethod()
  public getBalance(address: PublicKey): Option<UInt64> {
    return this.balances.get(address);
  }

  @runtimeMethod()
  public setBalanceIf(address: PublicKey, value: UInt64, condition: Bool) {
    assert(condition, "Condition not met");
    this.balances.set(address, value);
  }

  @runtimeMethod()
  public addBalance(address: PublicKey, value: UInt64) {
    const balance = this.balances.get(address);
    Provable.log("Balance:", balance.isSome, balance.value);
    const newBalance = balance.value.add(value);
    this.balances.set(address, newBalance);
  }
}
