import "reflect-metadata";

import { Balance, Balances, BalancesKey, TokenId } from "@proto-kit/library";
import {
  runtimeMethod,
  runtimeModule,
  RuntimeModule,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import { PrivateKey } from "o1js";
import { inject } from "tsyringe";
import { expectDefined } from "@proto-kit/common";

import { TestingAppChain } from "../src";

@runtimeModule()
class Faucet extends RuntimeModule<unknown> {
  public constructor(@inject("Balances") public balances: Balances) {
    super();
  }

  @runtimeMethod()
  public async drip() {
    await this.balances.mint(
      TokenId.from(0),
      this.transaction.sender.value,
      Balance.from(1000)
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface RuntimeModules extends RuntimeModulesRecord {
  Faucet: typeof Faucet;
}

describe("balances", () => {
  const feeRecipientKey = PrivateKey.random();
  const senderKey = PrivateKey.random();

  const appChain = TestingAppChain.fromRuntime({
    Faucet,
  });

  beforeAll(async () => {
    appChain.configurePartial({
      Runtime: {
        Faucet: {},
        Balances: {},
      },

      Protocol: {
        ...appChain.config.Protocol!,
        TransactionFee: {
          tokenId: 0n,
          feeRecipient: feeRecipientKey.toPublicKey().toBase58(),
          baseFee: 0n,
          perWeightUnitFee: 0n,
          methods: {
            "Faucet.drip": {
              baseFee: 0n,
              weight: 0n,
              perWeightUnitFee: 0n,
            },
          },
        },
      },
    });

    await appChain.start();
    appChain.setSigner(senderKey);
  });

  it("transfer from and to same account does not cause minting error", async () => {
    // expect.assertions(2);
    const faucet = appChain.runtime.resolve("Faucet");
    const balancesRuntime = appChain.runtime.resolve("Balances");

    const tx = await appChain.transaction(senderKey.toPublicKey(), async () => {
      await faucet.drip();
    });
    await tx.sign();
    await tx.send();
    await appChain.produceBlock();
    const balance = await appChain.query.runtime.Balances.balances.get(
      new BalancesKey({
        tokenId: new TokenId(0),
        address: senderKey.toPublicKey(),
      })
    );
    // Balance should be 1000
    expectDefined(balance);
    expect(balance.toString()).toBe("1000");

    // Sender sends tokens to itself.
    const tx2 = await appChain.transaction(
      senderKey.toPublicKey(),
      async () => {
        await balancesRuntime.transferSigned(
          TokenId.from(0),
          senderKey.toPublicKey(),
          feeRecipientKey.toPublicKey(),
          Balance.from(99)
        );
      }
    );
    await tx2.sign();
    await tx2.send();
    await appChain.produceBlock();

    const balance2 = await appChain.query.runtime.Balances.balances.get(
      new BalancesKey({
        tokenId: new TokenId(0),
        address: senderKey.toPublicKey(),
      })
    );
    // Balance should be 1000
    expectDefined(balance2);
    expect(balance2.toString()).toBe("1000");
  });
});
