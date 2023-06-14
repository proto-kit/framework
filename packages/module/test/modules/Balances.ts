import { PublicKey, UInt64 } from "snarkyjs";
import { FlipOptional, Option } from "@yab/protocol";
import { inject } from "tsyringe";

import { State } from "../../src/state/State.js";
import { state } from "../../src/state/decorator.js";
import { StateMap } from "../../src/state/StateMap.js";
import { RuntimeModule, method, runtimeModule } from "../../src";

import { Admin } from "./Admin.js";

@runtimeModule()
export class Balances extends RuntimeModule<{}> {
  @state() public totalSupply = State.from<UInt64>(UInt64);

  @state() public balances = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  public constructor(public admin: Admin) {
    super();
  }

  @method()
  public getTotalSupply() {
    this.totalSupply.get();
  }

  @method()
  public setTotalSupply() {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    this.totalSupply.set(UInt64.from(20));
    this.admin.isAdmin(PublicKey.empty());
  }

  @method()
  public getBalance(address: PublicKey): Option<UInt64> {
    return this.balances.get(address);
  }

  public get defaultConfig(): FlipOptional<void> {
    return {};
  }
}
