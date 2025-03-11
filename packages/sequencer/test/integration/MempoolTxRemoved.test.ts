import { Balances } from "@proto-kit/library";
import { Runtime } from "@proto-kit/module";
import { TestingAppChain } from "@proto-kit/sdk";
import { Bool, PrivateKey, UInt64 } from "o1js";
import "reflect-metadata";

import { PrivateMempool, Sequencer } from "../../src";

import { createTransaction } from "./utils";
import { Balance } from "./mocks/Balance";

describe("block production", () => {
  const senderKey = PrivateKey.random();
  const appChain = TestingAppChain.fromRuntime({ Balance });
  let mempool: PrivateMempool;
  let runtime: Runtime<{ Balances: typeof Balances; Balance: typeof Balance }>;
  let sequencer: Sequencer<any>;

  beforeAll(async () => {
    appChain.configurePartial({
      Runtime: {
        Balances: {},
        Balance: {},
      },
      Protocol: {
        ...appChain.config.Protocol!,
      },
    });

    await appChain.start();
    runtime = appChain.runtime;
    sequencer = appChain.sequencer;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    mempool = sequencer.resolve("Mempool");
  });

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

    await appChain.produceBlock();

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
  }, 60_000);
});
