import { Balances } from "@proto-kit/library";
import { Runtime } from "@proto-kit/module";
import { TestingAppChain } from "@proto-kit/sdk";
import { Bool, PrivateKey, UInt64 } from "o1js";
import "reflect-metadata";
import { expectDefined, log } from "@proto-kit/common";
import { afterEach, beforeEach, describe, expect } from "@jest/globals";

import { PrivateMempool, Sequencer } from "../../src";

import { createTransaction } from "./utils";
import { Balance } from "./mocks/Balance";

describe("mempool removal mechanism", () => {
  const senderKey = PrivateKey.random();
  let appChain: Awaited<ReturnType<typeof createAppChain>>;
  let mempool: PrivateMempool;
  let runtime: Runtime<{ Balances: typeof Balances; Balance: typeof Balance }>;
  let sequencer: Sequencer<any>;

  const createAppChain = async (validationEnabled: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const appChain = TestingAppChain.fromRuntime({ Balance });

    appChain.configurePartial({
      Runtime: {
        Balance: {},
        Balances: {},
      },
      Protocol: {
        ...appChain.config.Protocol!,
      },
      Sequencer: {
        ...appChain.config.Sequencer,
        Mempool: { validationEnabled },
      },
    });

    await appChain.start();
    runtime = appChain.runtime;
    sequencer = appChain.sequencer;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    mempool = sequencer.resolve("Mempool");

    return appChain;
  };

  afterEach(async () => {
    await appChain.close();
  });

  describe("block pipeline reaction", () => {
    beforeEach(async () => {
      appChain = await createAppChain(false);
    }, 60_000);

    it("check only one is included, other is skipped", async () => {
      log.setLevel("trace");

      await mempool.add(
        createTransaction({
          runtime,
          method: ["Balance", "setBalanceIf"],
          privateKey: senderKey,
          args: [senderKey.toPublicKey(), UInt64.from(100), Bool(true)],
          nonce: 0,
        })
      );

      await mempool.add(
        createTransaction({
          runtime,
          method: ["Balance", "setBalanceIf"],
          privateKey: senderKey,
          args: [senderKey.toPublicKey(), UInt64.from(100), Bool(true)],
          nonce: 2,
        })
      );

      const txs2 = await mempool.getTxs();
      expect(txs2.length).toBe(2);

      const block = await appChain.produceBlock();

      expectDefined(block);
      expect(block.transactions).toHaveLength(1);

      await expect(mempool.getTxs()).resolves.toHaveLength(1);
    });

    it("check only one is included, other is removed", async () => {
      await mempool.add(
        createTransaction({
          runtime,
          method: ["Balance", "setBalanceIf"],
          privateKey: senderKey,
          args: [senderKey.toPublicKey(), UInt64.from(100), Bool(true)],
          nonce: 0,
        })
      );

      await mempool.add(
        createTransaction({
          runtime,
          method: ["Balance", "setBalanceIf"],
          privateKey: senderKey,
          args: [senderKey.toPublicKey(), UInt64.from(102), Bool(true)],
          nonce: 0,
        })
      );

      const txs2 = await mempool.getTxs();
      expect(txs2.length).toBe(2);

      const block = await appChain.produceBlock();

      expectDefined(block);
      expect(block.transactions).toHaveLength(1);

      await expect(mempool.getTxs()).resolves.toHaveLength(0);
    });
  });

  describe("mempool simulation", () => {
    beforeEach(async () => {
      appChain = await createAppChain(true);
    }, 60_000);

    it("check tx is removed", async () => {
      await mempool.add(
        createTransaction({
          runtime,
          method: ["Balance", "setBalanceIf"],
          privateKey: senderKey,
          args: [senderKey.toPublicKey(), UInt64.from(100), Bool(true)],
          nonce: 0,
        })
      );

      await mempool.add(
        createTransaction({
          runtime,
          method: ["Balance", "setBalanceIf"],
          privateKey: senderKey,
          args: [senderKey.toPublicKey(), UInt64.from(100), Bool(true)],
          nonce: 1,
        })
      );

      const txs = await mempool.getTxs();
      expect(txs.length).toBe(2);

      await appChain!.produceBlock();

      await mempool.add(
        createTransaction({
          runtime,
          method: ["Balance", "setBalanceIf"],
          privateKey: senderKey,
          args: [senderKey.toPublicKey(), UInt64.from(100), Bool(true)],
          nonce: 2,
        })
      );

      await mempool.add(
        createTransaction({
          runtime,
          method: ["Balance", "setBalanceIf"],
          privateKey: senderKey,
          args: [senderKey.toPublicKey(), UInt64.from(100), Bool(true)],
          nonce: 0,
        })
      );

      const txs2 = await mempool.getTxs();
      expect(txs2.length).toBe(1);
    }, 300_000);
  });
});
