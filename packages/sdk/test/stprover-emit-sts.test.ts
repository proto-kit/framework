import "reflect-metadata";

import { UInt64 } from "@proto-kit/library";
import { runtimeMethod, runtimeModule, RuntimeModule } from "@proto-kit/module";
import { Field, PrivateKey, Provable } from "o1js";
import { State, state } from "@proto-kit/protocol";

import { TestingAppChain } from "../src";

@runtimeModule()
class StateTester extends RuntimeModule<unknown> {
  @state() public state1 = State.from<UInt64>(UInt64);

  @runtimeMethod()
  public async setFail() {
    await Provable.witnessAsync(Field, async () => {
      await this.state1.set(UInt64.from(10));
      return Field(0);
    });
  }

  @runtimeMethod()
  public async setPass() {
    await this.state1.set(UInt64.from(10));
  }
}

describe("StateTransition", () => {
  const senderKey = PrivateKey.random();

  const appChain = TestingAppChain.fromRuntime({
    StateTester,
  });

  beforeAll(async () => {
    appChain.configurePartial({
      Runtime: {
        StateTester: {},
        Balances: {},
      },

      Protocol: {
        ...appChain.config.Protocol!,
      },
    });

    await appChain.start();
    appChain.setSigner(senderKey);
  });

  it("should fails outside provable code", async () => {
    const stateTester = appChain.runtime.resolve("StateTester");
    const tx1 = await appChain.transaction(
      senderKey.toPublicKey(),
      async () => {
        await stateTester.setPass();
      }
    );
    await tx1.sign();
    await tx1.send();
    await appChain.produceBlock();

    const tx2 = await appChain.transaction(
      senderKey.toPublicKey(),
      async () => {
        await stateTester.setFail();
      }
    );
    await tx2.sign();
    await tx2.send();
    await expect(() => appChain.produceBlock()).rejects.toThrow(
      new Error("Cannot set state inside of provable block.")
    );
  });
});
