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
import { expectDefined, log } from "@proto-kit/common";
import { jest } from "@jest/globals";

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

describe("fees", () => {
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
          baseFee: 10000n,
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

  it("should reject transaction when the transaction fee exceeds the balance", async () => {
    expect.assertions(3);
    const balances = appChain.runtime.resolve("Balances");

    const tx = await appChain.transaction(senderKey.toPublicKey(), async () => {
      await balances.transferSigned(
        TokenId.from(0),
        senderKey.toPublicKey(),
        feeRecipientKey.toPublicKey(),
        Balance.from(100)
      );
    });

    await tx.sign();
    await tx.send();
    const logSpy = jest.spyOn(log, "error");

    await appChain.produceBlock();

    expect(logSpy).toHaveBeenCalledWith(
      "Error in inclusion of tx, skipping",
      Error("Protocol hooks not executable: From balance is insufficient")
    );

    const balance = await appChain.query.runtime.Balances.balances.get(
      new BalancesKey({
        tokenId: new TokenId(0),
        address: senderKey.toPublicKey(),
      })
    );

    expectDefined(balance);
    // The balance should be unchanged as the transaction should have failed
    expect(balance.toString()).toBe("1000");
  });
});

describe("fee errors", () => {
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
          baseFee: 10000n,
          perWeightUnitFee: 1n,
          methods: {
            "Faucet.made_up": {
              baseFee: 0n,
              weight: 0n,
              perWeightUnitFee: 0n,
            },
          },
        },
      },
    });
  });

  it("should crash due to the bad config", async () => {
    await expect(appChain.start()).rejects.toMatchObject(
      new Error("Faucet.made_up does not exist in the current runtime.")
    );
  });
});
