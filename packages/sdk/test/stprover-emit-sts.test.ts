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

  @runtimeMethod()
  public async getSTs() {
    await this.state1.get();
  }

  @runtimeMethod()
  public async getNoSTs() {
    await Provable.witnessAsync(Field, async () => {
      const stateReturned = await this.state1.get();
      return Field.from(stateReturned.value.toBigInt());
    });
  }
}

describe("StateTransition", () => {
  const senderKey = PrivateKey.random();

  const appChain = TestingAppChain.fromRuntime({
    StateTester,
  });

  beforeEach(async () => {
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

  it("should emit no sts for get", async () => {
    const stateTester = appChain.runtime.resolve("StateTester");

    // We set the state so when we fetch it it won't error.
    const tx0 = await appChain.transaction(
      senderKey.toPublicKey(),
      async () => {
        await stateTester.setPass();
      }
    );
    await tx0.sign();
    await tx0.send();
    await appChain.produceBlock();

    const tx1 = await appChain.transaction(
      senderKey.toPublicKey(),
      async () => {
        await stateTester.getSTs();
      }
    );
    await tx1.sign();
    await tx1.send();
    const block1 = await appChain.produceBlock();
    const block1Transactions = block1!.transactions[0].stateTransitions;

    expect(block1Transactions.length).not.toBe(0);

    const tx2 = await appChain.transaction(
      senderKey.toPublicKey(),
      async () => {
        await stateTester.getNoSTs();
      }
    );
    await tx2.sign();
    await tx2.send();
    const block2 = await appChain.produceBlock();
    const block2Transaction = block2!.transactions[0].stateTransitions;
    expect(block2Transaction.length).toBe(0);
  });

  it("should fail outside provable code for set", async () => {
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

    await expect(() =>
      appChain.transaction(senderKey.toPublicKey(), async () => {
        await stateTester.setFail();
      })
    ).rejects.toThrow(new Error("Cannot set state inside of provable block."));
  });
});
