/* eslint-disable max-statements */
import "reflect-metadata";
import { PrivateKey, PublicKey, UInt64, Provable } from "o1js";
import {
  runtimeMethod,
  RuntimeModule,
  runtimeModule,
  state,
} from "@proto-kit/module";
import { InMemoryAreProofsEnabled, TestingAppChain } from "../src/index";
import { container, inject } from "tsyringe";
import { AreProofsEnabled, log } from "@proto-kit/common";
import { randomUUID } from "crypto";
import {
  assert,
  RuntimeMethodExecutionContext,
  State,
  StateMap,
} from "@proto-kit/protocol";
import {
  LocalTaskWorkerModule,
  ManualBlockTrigger,
} from "@proto-kit/sequencer";

log.setLevel("debug");

export interface AdminConfig {
  admin: PublicKey;
}

@runtimeModule()
export class Admin extends RuntimeModule<AdminConfig> {
  public isSenderAdmin() {
    assert(
      this.transaction.sender.value.equals(this.config.admin),
      "Sender is not admin"
    );
  }
}

interface BalancesConfig {
  totalSupply: UInt64;
}

@runtimeModule()
class Balances extends RuntimeModule<BalancesConfig> {
  @state() public totalSupply = State.from<UInt64>(UInt64);

  @state() public balances = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  /**
   * The constructor function takes an instance of the Admin class as a parameter and assigns it to the
   * admin property.
   * @param {Admin} admin - The "admin" parameter is of type "Admin" and is being injected using the
   * "@inject" decorator.
   */
  public constructor(@inject("Admin") public admin: Admin) {
    super();
  }

  @runtimeMethod()
  public addBalance(address: PublicKey, balance: UInt64) {
    this.admin.isSenderAdmin();
    const totalSupply = this.totalSupply.get();

    const newTotalSupply = totalSupply.value.add(balance);
    const isSupplyNotOverflown = newTotalSupply.lessThanOrEqual(
      this.config.totalSupply
    );

    this.totalSupply.set(newTotalSupply);

    assert(
      isSupplyNotOverflown,
      "Adding the balance would overflow the total supply"
    );

    const isSender = this.transaction.sender.value.equals(address);
    assert(isSender, "Address is not the sender");

    const currentBalance = this.balances.get(address);

    const newBalance = currentBalance.value.add(balance);

    this.balances.set(address, newBalance);

    const context = container.resolve(RuntimeMethodExecutionContext);
    Provable.log("ST length", context.current().result.stateTransitions.length);
    Provable.log("RUNTIME HEIGHT", this.network.block.height);
  }
}

describe("testing app chain", () => {
  it("should enable a complete transaction roundtrip", async () => {
    expect.assertions(2);

    const signer = PrivateKey.random();
    const sender = signer.toPublicKey();

    /**
     * Setup the app chain for testing purposes,
     * using the provided runtime modules
     */
    const appChain = TestingAppChain.fromRuntime({
      modules: { Admin, Balances },
    });

    appChain.configurePartial({
      Runtime: {
        Admin: {
          admin: sender,
        },

        Balances: {
          totalSupply: UInt64.from(1000),
        },
      },
    });

    // start the chain, sequencer is now accepting transactions
    await appChain.start();

    const areProofsEnabled = appChain.resolveOrFail(
      "AreProofsEnabled",
      InMemoryAreProofsEnabled
    );
    areProofsEnabled.setProofsEnabled(true);

    console.log("areProofsEnabled", areProofsEnabled);

    const taskWorkerModule = appChain.sequencer.resolveOrFail(
      "LocalTaskWorkerModule",
      LocalTaskWorkerModule
    );
    await taskWorkerModule.prepare();

    /**
     *  Setup the transaction signer / sender
     */
    appChain.setSigner(signer);

    /**
     * Resolve the registred 'Balances' module and
     * send a transaction to `addBalance` for sender
     */
    const balances = appChain.runtime.resolve("Balances");
    // prepare a transaction invoking `Balances.setBalance`
    const transaction = await appChain.transaction(sender, () => {
      balances.addBalance(sender, UInt64.from(1000));
    });

    await transaction.sign();
    await transaction.send();

    /**
     * Produce the next block from pending transactions in the mempool
     */
    const block = await appChain.produceBlock();

    expect(block?.transactions[0].status.toBoolean()).toBe(true);

    console.log("proving");
    console.time("prove");
    const provenBlock = await appChain.sequencer
      .resolveOrFail("BlockTrigger", ManualBlockTrigger)
      .produceProven();
    console.timeEnd("prove");
    /**
     * Observe new state after the block has been produced
     */
    const balance = await appChain.query.runtime.Balances.balances.get(sender);

    expect(balance?.toBigInt()).toBe(1000n);

    Provable.log("unproven", block);

    Provable.log("proof", {
      input: provenBlock?.proof.publicInput,
      output: provenBlock?.proof.publicOutput,
    });
  }, 6_000_000);
});
