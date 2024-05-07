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
    this.balances.mint(
      new TokenId(0),
      this.transaction.sender.value,
      Balance.from(1000)
    );
  }
}

@runtimeModule()
class Pit extends RuntimeModule<unknown> {
  public constructor(@inject("Balances") public balances: Balances) {
    super();
  }

  @runtimeMethod()
  public async burn(amount: Balance) {
    this.balances.burn(TokenId.from(0), this.transaction.sender.value, amount);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface RuntimeModules extends RuntimeModulesRecord {
  Faucet: typeof Faucet;
  Pit: typeof Pit;
}

describe("fees", () => {
  const feeRecipientKey = PrivateKey.random();
  const senderKey = PrivateKey.random();

  const appChain = TestingAppChain.fromRuntime({
    Faucet,
    Pit,
  });

  beforeAll(async () => {
    appChain.configurePartial({
      Runtime: {
        Faucet: {},
        Pit: {},
        Balances: {},
      },

      Protocol: {
        ...appChain.config.Protocol!,
        TransactionFee: {
          tokenId: 0n,
          feeRecipient: feeRecipientKey.toPublicKey().toBase58(),
          baseFee: 0n,
          perWeightUnitFee: 1n,
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

  it("should allow a free faucet transaction", async () => {
    expect.assertions(2);

    const faucet = appChain.runtime.resolve("Faucet");

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

    expectDefined(balance);
    expect(balance.toString()).toBe("1000");
  });

  it("should allow burning of tokens with a fixed fee", async () => {
    expect.assertions(2);

    const pit = appChain.runtime.resolve("Pit");

    const tx = await appChain.transaction(senderKey.toPublicKey(), async () => {
      await pit.burn(Balance.from(100));
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

    expectDefined(balance);
    expect(balance.toString()).toBe("512");
  });
});
