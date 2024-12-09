import {
  runtimeMessage,
  runtimeMethod,
  runtimeModule,
  RuntimeModule,
  state,
} from "@proto-kit/module";
import { log, Presets } from "@proto-kit/common";
import { PublicKey, UInt64 } from "o1js";
import { Admin } from "@proto-kit/module/test/modules/Admin";
import { Deposit, State, StateMap } from "@proto-kit/protocol";

@runtimeModule()
export class ProvenBalance extends RuntimeModule<object> {
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
  public async addBalance(address: PublicKey, value: UInt64) {
    const totalSupply = await this.totalSupply.get();
    await this.totalSupply.set(totalSupply.orElse(UInt64.zero).add(value));

    const balance = await this.balances.get(address);

    log.provable.debug("Balance:", balance.isSome, balance.value);

    const newBalance = balance.orElse(UInt64.zero).add(value);
    await this.balances.set(address, newBalance);
  }

  @runtimeMessage()
  public async deposit(deposit: Deposit) {
    await this.addBalance(deposit.address, deposit.amount);
  }
}
