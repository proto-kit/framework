import "reflect-metadata";
import { Balances } from "@proto-kit/library";
import { Runtime } from "@proto-kit/module";
import { Bool, PrivateKey, UInt64 } from "o1js";
import { expectDefined, log } from "@proto-kit/common";
import { afterEach, beforeEach, describe, expect } from "@jest/globals";
import { Protocol } from "@proto-kit/protocol";

import {
  AppChain,
  ManualBlockTrigger,
  PrivateMempool,
  Sequencer,
  VanillaTaskWorkerModules,
} from "../../src";
import { testingSequencerModules } from "../TestingSequencer";

import { createTransaction } from "./utils";
import { Balance } from "./mocks/Balance";

describe("mempool removal mechanism", () => {
  const senderKey = PrivateKey.random();
  let appChain: Awaited<ReturnType<typeof createAppChain>>;
  let mempool: PrivateMempool;
  let runtime: Runtime<{ Balances: typeof Balances; Balance: typeof Balance }>;
  let sequencer: Sequencer<any>;
  let trigger: ManualBlockTrigger;

  const createAppChain = async () => {
    const app = AppChain.from({
      Sequencer: Sequencer.from(testingSequencerModules({})),
      Protocol: Protocol.from(Protocol.defaultModules()),
      Runtime: Runtime.from({
        Balances,
        Balance,
      }),
    });

    app.configurePartial({
      Runtime: {
        Balance: {},
        Balances: {},
      },
      Protocol: {
        ...Protocol.defaultConfig(),
      },
      Sequencer: {
        Database: {},
        BlockTrigger: {},
        Mempool: {},
        BatchProducerModule: {},
        BlockProducerModule: {},
        WorkerModule: VanillaTaskWorkerModules.defaultConfig(),
        BaseLayer: {},
        TaskQueue: {},
        FeeStrategy: {},
        SequencerStartupModule: {},
      },
    });

    await app.start();
    runtime = app.runtime;
    sequencer = app.sequencer;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    mempool = sequencer.resolve("Mempool");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    trigger = sequencer.resolve("BlockTrigger");

    return app;
  };

  beforeEach(async () => {
    appChain = await createAppChain();
  }, 60_000);

  afterEach(async () => {
    await appChain.close();
  });

  describe("block pipeline reaction", () => {
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

      const block = await trigger.produceBlock();

      expectDefined(block);
      expect(block.transactions).toHaveLength(1);

      await expect(mempool.getTxs()).resolves.toHaveLength(0);
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

      const block = await trigger.produceBlock();

      expectDefined(block);
      expect(block.transactions).toHaveLength(1);

      await expect(mempool.getTxs()).resolves.toHaveLength(0);
    });
  });

  describe("block production reordering", () => {
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

      await trigger!.produceBlock();

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
