import { Presets } from "@proto-kit/common";
import {
  runtimeMethod,
  RuntimeModule,
  runtimeModule,
  state,
} from "@proto-kit/module";
import { Option, State, StateMap } from "@proto-kit/protocol";
import { PublicKey, UInt64 } from "o1js";
import { AppChain } from "@proto-kit/sdk";

import { LocalhostAppChainModules } from "../src";

@runtimeModule()
export class Balances extends RuntimeModule<object> {
  /**
   * We use `satisfies` here in order to be able to access
   * presets by key in a type safe way.
   */
  public static presets = {} satisfies Presets<object>;

  @state() public balances = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  @state() public totalSupply = State.from(UInt64);

  @runtimeMethod()
  public async getBalance(address: PublicKey): Promise<Option<UInt64>> {
    return await this.balances.get(address);
  }

  @runtimeMethod()
  public async setBalance(address: PublicKey, balance: UInt64) {
    await this.balances.set(address, balance);
  }
}

const appChain = AppChain.from(
  LocalhostAppChainModules.fromRuntime({
    Balances,
  })
);

appChain.configurePartial(LocalhostAppChainModules.defaultConfig());

appChain.configurePartial({
  Runtime: {
    Balances: {},
  },
});

export default appChain;
