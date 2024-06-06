import {
  runtimeMessage,
  runtimeMethod,
  runtimeModule,
  RuntimeModule,
  state,
} from "@proto-kit/module";
import { log, Presets, range, mapSequential } from "@proto-kit/common";
import { Bool, Field, PublicKey, UInt64 } from "o1js";
import { Admin } from "@proto-kit/module/test/modules/Admin";
import { Option, State, StateMap, assert, Deposit } from "@proto-kit/protocol";

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

  @runtimeMessage()
  public async deposit(deposit: Deposit) {
    const balance = await this.balances.get(deposit.address);
    await this.balances.set(deposit.address, balance.value.add(deposit.amount));
  }

  @runtimeMethod()
  public async getTotalSupply() {
    await this.totalSupply.get();
  }

  // @runtimeMethod()
  // public test(a: UInt64, b: Signature, c: MyStruct, d: Struct<unknown>) {}

  @runtimeMethod()
  public async setTotalSupply() {
    await this.totalSupply.set(UInt64.from(20));
    await this.admin.isAdmin(this.transaction.sender.value);
  }

  @runtimeMethod()
  public async getBalance(address: PublicKey): Promise<Option<UInt64>> {
    return await this.balances.get(address);
  }

  @runtimeMethod()
  public async setBalanceIf(
    address: PublicKey,
    value: UInt64,
    condition: Bool
  ) {
    assert(condition, "Condition not met");
    await this.balances.set(address, value);
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

  @runtimeMethod()
  public async addBalanceToSelf(value: UInt64, blockHeight: UInt64) {
    const address = this.transaction.sender.value;
    const balance = await this.balances.get(address);

    log.provable.debug("Sender:", address);
    log.provable.debug("Balance:", balance.isSome, balance.value);
    log.provable.debug("BlockHeight:", this.network.block.height);

    assert(
      blockHeight.equals(this.network.block.height),
      () =>
        `Blockheight not matching ${blockHeight.toString()} !== ${this.network.block.height.toString()}`
    );

    const newBalance = balance.value.add(value);
    await this.balances.set(address, newBalance);
  }

  @runtimeMethod()
  public async lotOfSTs(randomArg: Field) {
    await mapSequential(range(0, 10), async (index) => {
      const pk = PublicKey.from({
        x: randomArg.add(Field(index % 5)),
        isOdd: Bool(false),
      });
      const value = await this.balances.get(pk);
      await this.balances.set(pk, value.orElse(UInt64.zero).add(100));
      const supply = (await this.totalSupply.get()).orElse(UInt64.zero);
      await this.totalSupply.set(supply.add(UInt64.from(100)));
    });
  }
}
