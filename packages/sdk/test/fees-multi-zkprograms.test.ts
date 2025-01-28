import "reflect-metadata";

import { runtimeMethod, runtimeModule, RuntimeModule } from "@proto-kit/module";
import { PrivateKey } from "o1js";
import { expectDefined, noop } from "@proto-kit/common";
import { inject } from "tsyringe";
import { Balance, Balances, BalancesKey, TokenId } from "@proto-kit/library";

import { TestingAppChain } from "../src";

// This test is designed to check what happens when we have multiple zkPrograms.
// Currently, the hardcoded maximum for methods per zkProgram is 8 (see Runtime.ts).
// We will create 20 runtime methods to ensure 3 zkPrograms are created.

@runtimeModule()
class TestModule1 extends RuntimeModule<unknown> {
  @runtimeMethod()
  public async Method_1() {
    noop();
  }

  @runtimeMethod()
  public async Method_2() {
    noop();
  }

  @runtimeMethod()
  public async Method_3() {
    noop();
  }

  @runtimeMethod()
  public async Method_4() {
    noop();
  }

  @runtimeMethod()
  public async Method_5() {
    noop();
  }

  @runtimeMethod()
  public async Method_6() {
    noop();
  }

  @runtimeMethod()
  public async Method_7() {
    noop();
  }

  @runtimeMethod()
  public async Method_8() {
    noop();
  }

  @runtimeMethod()
  public async Method_9() {
    noop();
  }

  @runtimeMethod()
  public async Method_10() {
    noop();
  }
}

@runtimeModule()
class TestModule2 extends RuntimeModule<unknown> {
  @runtimeMethod()
  public async Method_1() {
    noop();
  }

  @runtimeMethod()
  public async Method_2() {
    noop();
  }

  @runtimeMethod()
  public async Method_3() {
    noop();
  }

  @runtimeMethod()
  public async Method_4() {
    noop();
  }

  @runtimeMethod()
  public async Method_5() {
    noop();
  }

  @runtimeMethod()
  public async Method_6() {
    noop();
  }

  @runtimeMethod()
  public async Method_7() {
    noop();
  }

  @runtimeMethod()
  public async Method_8() {
    noop();
  }

  @runtimeMethod()
  public async Method_9() {
    noop();
  }

  @runtimeMethod()
  public async Method_10() {
    noop();
  }
}

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

describe("check fee analyzer", () => {
  const feeRecipientKey = PrivateKey.random();
  const senderKey = PrivateKey.random();

  const appChain = TestingAppChain.fromRuntime({
    TestModule1,
    TestModule2,
    Faucet,
  });

  beforeAll(async () => {
    appChain.configurePartial({
      Runtime: {
        TestModule1,
        TestModule2,
        Faucet,
        Balances,
      },

      Protocol: {
        ...appChain.config.Protocol!,
        TransactionFee: {
          tokenId: 0n,
          feeRecipient: feeRecipientKey.toPublicKey().toBase58(),
          baseFee: 0n,
          perWeightUnitFee: 0n,
          methods: {
            "TestModule1.Method_1": {
              baseFee: 9n,
              weight: 0n,
              perWeightUnitFee: 0n,
            },
            "TestModule1.Method_10": {
              baseFee: 8n,
              weight: 0n,
              perWeightUnitFee: 0n,
            },
            "TestModule2.Method_4": {
              baseFee: 7n,
              weight: 0n,
              perWeightUnitFee: 0n,
            },
            "TestModule2.Method_7": {
              baseFee: 6n,
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

  it("with multiple zk programs", async () => {
    expect.assertions(12);
    const testModule1 = appChain.runtime.resolve("TestModule1");
    const testModule2 = appChain.runtime.resolve("TestModule2");
    const faucet = appChain.runtime.resolve("Faucet");
    const transactionFeeModule = appChain.protocol.resolve("TransactionFee");

    const tx1 = await appChain.transaction(
      senderKey.toPublicKey(),
      async () => {
        await faucet.drip();
      },
      { nonce: 0 }
    );

    await tx1.sign();
    await tx1.send();

    const tx2 = await appChain.transaction(
      senderKey.toPublicKey(),
      async () => {
        await testModule1.Method_1();
      },
      { nonce: 4 }
    );

    await tx2.sign();
    await tx2.send();
    const methodId2 = tx2.transaction?.methodId.toBigInt();
    expectDefined(methodId2);
    const transactionFeeConfig2 =
      transactionFeeModule.feeAnalyzer.getFeeConfig(methodId2);
    const transactionFee2 = transactionFeeModule.getFee(transactionFeeConfig2);
    expect(transactionFee2.toString()).toEqual("9");

    const tx3 = await appChain.transaction(
      senderKey.toPublicKey(),
      async () => {
        await testModule2.Method_4();
      },
      { nonce: 1 }
    );

    await tx3.sign();
    await tx3.send();
    const methodId3 = tx3.transaction?.methodId.toBigInt();
    expectDefined(methodId3);
    const transactionFeeConfig3 =
      transactionFeeModule.feeAnalyzer.getFeeConfig(methodId3);
    const transactionFee3 = transactionFeeModule.getFee(transactionFeeConfig3);
    expect(transactionFee3.toString()).toEqual("7");

    const tx4 = await appChain.transaction(
      senderKey.toPublicKey(),
      async () => {
        await testModule2.Method_7();
      },
      { nonce: 2 }
    );

    await tx4.sign();
    await tx4.send();

    const methodId4 = tx4.transaction?.methodId.toBigInt();
    expectDefined(methodId4);
    const transactionFeeConfig4 =
      transactionFeeModule.feeAnalyzer.getFeeConfig(methodId4);
    const transactionFee4 = transactionFeeModule.getFee(transactionFeeConfig4);
    expect(transactionFee4.toString()).toEqual("6");

    const tx5 = await appChain.transaction(
      senderKey.toPublicKey(),
      async () => {
        await testModule1.Method_10();
      },
      { nonce: 3 }
    );

    await tx5.sign();
    await tx5.send();

    const methodId5 = tx5.transaction?.methodId.toBigInt();
    expectDefined(methodId5);
    const transactionFeeConfig5 =
      transactionFeeModule.feeAnalyzer.getFeeConfig(methodId5);
    const transactionFee5 = transactionFeeModule.getFee(transactionFeeConfig5);
    expect(transactionFee5.toString()).toEqual("8");

    await appChain.produceBlock();

    const senderBalance = await appChain.query.runtime.Balances.balances.get(
      new BalancesKey({
        tokenId: new TokenId(0),
        address: senderKey.toPublicKey(),
      })
    );

    const feeRecipientBalance =
      await appChain.query.runtime.Balances.balances.get(
        new BalancesKey({
          tokenId: new TokenId(0),
          address: feeRecipientKey.toPublicKey(),
        })
      );

    expectDefined(senderBalance);
    expect(senderBalance.toString()).toBe("970");

    expectDefined(feeRecipientBalance);
    expect(feeRecipientBalance.toString()).toBe("30");
  });
});
