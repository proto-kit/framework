import "reflect-metadata";
import { PrivateKey, Provable, PublicKey, Signature, UInt64 } from "snarkyjs";
import {
  assert,
  InMemoryStateService,
  Runtime,
  runtimeMethod,
  RuntimeModule,
  runtimeModule,
  RuntimeModulesRecord,
  state,
  StateMap,
} from "@yab/module";
import {
  AsyncStateService,
  Sequencer,
  sequencerModule,
  SequencerModule,
} from "@yab/sequencer";
import { inject } from "tsyringe";
import { VanillaProtocol } from "@yab/protocol/src/protocol/Protocol";

import { AppChain } from "../../src";
import { InMemorySigner } from "../../src/transaction/InMemorySigner";
import { InMemoryTransactionSender } from "../../src/transaction/InMemoryTransactionSender";
import { TestingAppChain } from "../../src/appChain/TestingAppChain";
import { Path } from "@yab/protocol";

interface BalancesConfig {}

@runtimeModule()
class Balances extends RuntimeModule<BalancesConfig> {
  @state() public balances = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  @runtimeMethod()
  public addBalance(address: PublicKey, balance: UInt64) {
    const currentBalance = this.balances.get(address);

    const newBalance = currentBalance.value.add(balance);

    Provable.log("balances", {
      currentBalance: currentBalance.value.toBigInt(),
      newBalance: newBalance.toBigInt(),
    });
    this.balances.set(address, newBalance);
  }
}

describe("appChain", () => {
  it("should compose appchain correctly", async () => {
    expect.assertions(0);

    // create a testing app chain from the provided runtime modules
    const appChain = TestingAppChain.fromRuntime({
      modules: { Balances },
      config: { Balances: {} },
    });

    // set a signer for the transaction API
    const signer = PrivateKey.random();
    const sender = signer.toPublicKey();

    appChain.setSigner(signer);

    // start the chain, sequencer is now accepting transactions
    await appChain.start();

    const balances = appChain.runtime.resolve("Balances");

    // prepare a transaction invoking `Balances.setBalance`
    async function addBalance() {
      const transaction = appChain.transaction(sender, () => {
        balances.addBalance(sender, UInt64.from(1000));
      });

      await transaction.sign();
      await transaction.send();
    }

    // observe the new chain state after the transaction
    async function getBalance() {
      const senderBalancePath = Path.fromKey(
        balances.balances.path!,
        balances.balances.keyType,
        sender
      );

      const stateService =
        appChain.sequencer.dependencyContainer.resolve<AsyncStateService>(
          "AsyncStateService"
        );
      const senderBalance = await stateService.getAsync(senderBalancePath);

      return UInt64.fromFields(senderBalance!);
    }

    await addBalance();
    // once the transaction has been sent to the mempool, produce a block
    await appChain.produceBlock();

    console.log("balance", (await getBalance()).toBigInt());
  }, 60_000);
});
