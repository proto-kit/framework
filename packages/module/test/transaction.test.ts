import "reflect-metadata";
import { PrivateKey, Proof, PublicKey, UInt64 } from "snarkyjs";
import { container } from "tsyringe";
import {
  InMemoryStateService,
  MethodPublicOutput,
  Runtime,
  runtimeMethod,
  RuntimeMethodExecutionContext,
} from "../src";
import { runtimeModule } from "../src/module/decorator";
import { RuntimeModule } from "../src/runtime/RuntimeModule";
import { state } from "../../protocol/src/state/decorator";
import { StateMap } from "@proto-kit/protocol";

interface BalancesConfig {}
@runtimeModule()
class Balances extends RuntimeModule<BalancesConfig> {
  @state() public balances = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  @runtimeMethod()
  public setBalance(to: PublicKey, amount: UInt64) {
    this.balances.set(to, amount);
  }

  @runtimeMethod()
  public transfer(from: PublicKey, to: PublicKey, amount: UInt64) {
    const fromBalance = this.balances.get(from);
    const toBalance = this.balances.get(to);

    this.balances.set(from, fromBalance.value.sub(amount));
    this.balances.set(to, toBalance.value.add(amount));
  }
}

describe("transaction", () => {
  it("should update the state", async () => {
    expect.assertions(0);

    const runtime = Runtime.from({
      modules: {
        Balances,
      },

      config: {
        Balances: {},
      },

      state: new InMemoryStateService(),
    });

    const alice = PrivateKey.random().toPublicKey();
    const bob = PrivateKey.random().toPublicKey();

    const balances = runtime.resolve("Balances");

    runtime.transaction(() => {
      balances.setBalance(alice, UInt64.from(1000));
    });

    runtime.transaction(() => {
      balances.transfer(alice, bob, UInt64.from(100));
    });

    const executionContext = container.resolve<RuntimeMethodExecutionContext>(
      RuntimeMethodExecutionContext
    );

    const balanceAlice = balances.balances.get(alice);
    const balanceBob = balances.balances.get(bob);

    console.log("balances", {
      // 900
      alice: balanceAlice.value.toString(),
      // 100
      bob: balanceBob.value.toString(),
    });
  });
});
