import "reflect-metadata";
import {
  PrivateKey,
  Provable,
  PublicKey,
  Signature,
  Struct,
  UInt64,
} from "snarkyjs";
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
  State,
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

@runtimeModule()
class Balances extends RuntimeModule<unknown> {
  @state() public totalSupply = State.from<UInt64>(UInt64);

  @state() public balances = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  @runtimeMethod()
  public addBalance(address: PublicKey, balance: UInt64) {
    // this.totalSupply.set(UInt64.from(5000000));
    const currentBalance = this.balances.get(address);

    const newBalance = currentBalance.value.add(balance);

    this.balances.set(address, newBalance);
  }
}

describe("testing app chain", () => {
  it("should enable a complete transaction roundtrip", async () => {
    expect.assertions(1);
    console.time("test");
    /**
     * Setup the app chain for testing purposes,
     * using the provided runtime modules
     */
    const appChain = TestingAppChain.fromRuntime({
      modules: { Balances },
      config: { Balances: {} },
    });

    /**
     *  Setup the transaction signer / sender
     */
    const signer = PrivateKey.random();
    const sender = signer.toPublicKey();
    appChain.setSigner(signer);

    // start the chain, sequencer is now accepting transactions
    await appChain.start();

    /**
     * Resolve the registred 'Balances' module and
     * send a transaction to `addBalance` for sender
     */
    const balances = appChain.runtime.resolve("Balances");

    // prepare a transaction invoking `Balances.setBalance`
    const transaction = appChain.transaction(sender, () => {
      balances.addBalance(sender, UInt64.from(1000));
    });

    await transaction.sign();
    await transaction.send();

    /**
     * Produce the next block from pending transactions in the mempool
     */
    await appChain.produceBlock();

    /**
     * Observe new state after the block has been produced
     */
    const balance = await appChain.query.Balances.balances.get(sender);

    expect(balance?.toBigInt()).toBe(1000n);
    console.timeEnd("test");
  }, 60_000);
});
