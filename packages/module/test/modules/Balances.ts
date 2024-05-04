import { PublicKey, UInt64 } from "o1js";
import { State, StateMap } from "@proto-kit/protocol";
import { Presets } from "@proto-kit/common";

import { RuntimeModule, runtimeMethod, runtimeModule, state } from "../../src";

import { Admin } from "./Admin.js";

interface BalancesConfig {}

@runtimeModule()
export class Balances extends RuntimeModule<BalancesConfig> {
  /**
   * We use `satisfies` here in order to be able to access
   * presets by key in a type safe way.
   */
  public static presets = {} satisfies Presets<BalancesConfig>;

  @state() public totalSupply = State.from<UInt64>(UInt64);

  @state() public balances = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  public constructor(public admin: Admin) {
    super();
  }

  @runtimeMethod()
  public async getTotalSupply() {
    this.totalSupply.get();
  }

  @runtimeMethod()
  public async setTotalSupply() {
    this.totalSupply.set(UInt64.from(20));
    await this.admin.isAdmin(this.transaction.sender.value);
  }

  @runtimeMethod()
  public async getBalance(address: PublicKey) {
    this.balances.get(address).orElse(UInt64.zero);
  }

  @runtimeMethod()
  public async transientState() {
    const totalSupply = this.totalSupply.get();
    this.totalSupply.set(totalSupply.orElse(UInt64.zero).add(100));

    const totalSupply2 = this.totalSupply.get();
    this.totalSupply.set(totalSupply2.orElse(UInt64.zero).add(100));
  }
}
