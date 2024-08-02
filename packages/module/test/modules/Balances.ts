import { PublicKey, UInt64, Struct } from "o1js";
import { State, StateMap } from "@proto-kit/protocol";
import { Presets } from "@proto-kit/common";

import { RuntimeModule, runtimeMethod, runtimeModule, state } from "../../src";

import { Admin } from "./Admin.js";

interface BalancesConfig {}

export class TransferEvent extends Struct({
  from: PublicKey,
  to: PublicKey,
  amount: UInt64,
}) {}

@runtimeModule()
export class Balances extends RuntimeModule<BalancesConfig> {
  /**
   * We use `satisfies` here in order to be able to access
   * presets by key in a type safe way.
   */
  public static presets = {} satisfies Presets<BalancesConfig>;

  events = {
    transfer: TransferEvent,
  } as const;

  @state() public totalSupply = State.from<UInt64>(UInt64);

  @state() public balances = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  public constructor(public admin: Admin) {
    super();
  }

  @runtimeMethod()
  public async transfer(a: PublicKey, b: PublicKey, amount: UInt64) {
    // Transfer
    // type X = InferProvable<this["events"]["transfer"]>;
    // const x: T = {
    //   from: a,
    //   to: b,
    //   amount,
    // };
    // type T = InferProvable<this["events"]["transfer"]>;
    // this.emit(
    //   "transfer",
    //   new TransferEvent({
    //     from: a,
    //     to: b,
    //     amount,
    //   })
    // );
  }

  @runtimeMethod()
  public async getTotalSupply() {
    await this.totalSupply.get();
  }

  @runtimeMethod()
  public async setTotalSupply() {
    await this.totalSupply.set(UInt64.from(20));
    await this.admin.isAdmin(this.transaction.sender.value);
  }

  @runtimeMethod()
  public async getBalance(address: PublicKey) {
    (await this.balances.get(address)).orElse(UInt64.zero);
  }

  @runtimeMethod()
  public async transientState() {
    const totalSupply = await this.totalSupply.get();
    await this.totalSupply.set(totalSupply.orElse(UInt64.zero).add(100));

    const totalSupply2 = await this.totalSupply.get();
    await this.totalSupply.set(totalSupply2.orElse(UInt64.zero).add(100));
  }
}
