import "reflect-metadata";
import { randomUUID } from "crypto";

import { inject } from "tsyringe";
import {
  runtimeMethod,
  RuntimeModule,
  runtimeModule,
  state,
} from "@proto-kit/module";
import { PrivateKey, Provable, PublicKey } from "o1js";
import { assert, State } from "@proto-kit/protocol";
import { Balances, BalancesKey, TokenId, UInt64 } from "@proto-kit/library";
import { log } from "@proto-kit/common";

import { TestingAppChain } from "../src/index";

export interface AdminConfig {
  admin: PublicKey;
}

@runtimeModule()
export class Admin extends RuntimeModule<AdminConfig> {
  public id = randomUUID();

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
class CustomBalances extends Balances<BalancesConfig> {
  @state() public totalSupply = State.from<UInt64>(UInt64);

  public constructor(@inject("Admin") public admin: Admin) {
    super();
  }

  @runtimeMethod()
  public async addBalance(address: PublicKey, balance: UInt64) {
    const totalSupply = this.totalSupply.get();

    // TODO Fix UInt issues to remove new UInt()
    const newTotalSupply = UInt64.Unsafe.fromField(totalSupply.value.value).add(
      balance
    );
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

    const currentBalance = this.balances.get(
      new BalancesKey({ tokenId: TokenId.from(0n), address })
    );

    // TODO Fix UInt issues to remove new UInt()
    const newBalance = UInt64.Unsafe.fromField(currentBalance.value.value).add(
      balance
    );

    this.balances.set(
      new BalancesKey({ tokenId: TokenId.from(0n), address }),
      newBalance
    );
  }

  // @runtimeMethod()
  public foo() {}
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
      Admin,
      Balances: CustomBalances,
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
      Protocol: {
        ...appChain.config.Protocol!,
        TransactionFee: {
          tokenId: 0n,
          feeRecipient: PrivateKey.random().toPublicKey().toBase58(),
          baseFee: 0n,
          perWeightUnitFee: 0n,
          methods: {},
        },
      },
    });

    // start the chain, sequencer is now accepting transactions
    await appChain.start();

    log.setLevel("INFO");

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
    const transaction = await appChain.transaction(sender, async () => {
      await balances.addBalance(sender, UInt64.from(1000));
    });

    await transaction.sign();
    await transaction.send();

    /**
     * Produce the next block from pending transactions in the mempool
     */
    const block = await appChain.produceBlock();

    Provable.log("block", block);

    expect(block?.transactions[0].status.toBoolean()).toBe(true);

    /**
     * Observe new state after the block has been produced
     */
    const balance = await appChain.query.runtime.Balances.balances.get(
      new BalancesKey({ tokenId: TokenId.from(0n), address: sender })
    );

    expect(balance?.toBigInt()).toBe(1000n);
  }, 60_000);
});
