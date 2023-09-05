/* eslint-disable max-statements */
import "reflect-metadata";
import { PrivateKey, PublicKey, UInt64, Provable } from "snarkyjs";
import {
  runtimeMethod,
  RuntimeModule,
  runtimeModule,
  state,
  assert,
} from "@proto-kit/module";
import { TestingAppChain } from "../../src/appChain/TestingAppChain";
import { container, inject } from "tsyringe";
import { log } from "@proto-kit/common";
import { randomUUID } from "crypto";
import {
  MapStateMapToQuery, MapStateToQuery,
  ModuleQuery,
  PickStateMapProperties,
  PickStateProperties
} from "../../src";
import { State, StateMap } from "@proto-kit/protocol";

log.setLevel("ERROR");

export interface AdminConfig {
  admin: PublicKey;
}

@runtimeModule()
export class Admin extends RuntimeModule<AdminConfig> {
  public id = randomUUID();

  public isSenderAdmin() {
    assert(
      this.transaction.sender.equals(this.config.admin),
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

  public constructor(@inject("Admin") public admin: Admin) {
    console.log("admin injected", admin.id);
    super();
  }

  @runtimeMethod()
  public addBalance(address: PublicKey, balance: UInt64) {
    Provable.log("admin", {
      admin: this.admin.config.admin,
    });
    const totalSupply = this.totalSupply.get();

    const newTotalSupply = totalSupply.value.add(balance);
    const isSupplyNotOverflown = newTotalSupply.lessThanOrEqual(
      this.config.totalSupply
    );

    this.totalSupply.set(newTotalSupply);

    Provable.log("isSupplyNotOverflown", isSupplyNotOverflown);
    Provable.log("config total supply", this.config.totalSupply);

    assert(
      isSupplyNotOverflown,
      "Adding the balance would overflow the total supply"
    );

    Provable.log({
      address,
      sender: this.transaction.sender,
    });
    const isSender = this.transaction.sender.equals(address);
    assert(isSender, "Address is not the sender");

    const currentBalance = this.balances.get(address);

    const newBalance = currentBalance.value.add(balance);

    this.balances.set(address, newBalance);
  }
}

describe("testing app chain", () => {
  it("should enable a complete transaction roundtrip", async () => {
    expect.assertions(2);

    console.time("test");
    const signer = PrivateKey.random();
    const sender = signer.toPublicKey();

    /**
     * Setup the app chain for testing purposes,
     * using the provided runtime modules
     */
    const appChain = TestingAppChain.fromRuntime({
      modules: { Admin, Balances },

      config: {
        Admin: {
          admin: sender,
        },

        Balances: {
          totalSupply: UInt64.from(1000),
        },
      },
    });

    /**
     *  Setup the transaction signer / sender
     */
    appChain.setSigner(signer);

    // start the chain, sequencer is now accepting transactions
    await appChain.start();

    /**
     * Resolve the registred 'Balances' module and
     * send a transaction to `addBalance` for sender
     */
    const balances = appChain.runtime.resolve("Balances");
    const bob = PrivateKey.random().toPublicKey();
    console.log("TRYING IN TRANSACTION");
    // prepare a transaction invoking `Balances.setBalance`
    const transaction = appChain.transaction(sender, () => {
      balances.addBalance(sender, UInt64.from(1000));
    });

    await transaction.sign();
    await transaction.send();

    console.log("PRODUCING BLOCK NOW");

    /**
     * Produce the next block from pending transactions in the mempool
     */
    const block = await appChain.produceBlock();

    expect(block?.txs[0].status).toBe(true);

    /**
     * Observe new state after the block has been produced
     */
    const balance = await appChain.query.Balances.balances.get(sender);
    const balanceBob = await appChain.query.Balances.balances.get(bob);

    Provable.log("balances", {
      balance,
      balanceBob,
    });

    expect(balance?.toBigInt()).toBe(1000n);
    console.timeEnd("test");
  }, 60_000);
});