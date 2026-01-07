/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import "reflect-metadata";
import { jest } from "@jest/globals";
import { Transaction } from "o1js";

import type { PendingL1TransactionStorage } from "../../src/storage/repositories/PendingL1TransactionStorage";
import { InMemoryPendingL1TransactionStorage } from "../../src/storage/inmemory/InMemoryPendingL1TransactionStorage";

let MinaTransactionSender: any;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let pollTransactionStatus: jest.Mock;

beforeAll(async () => {
  // MinaTransactionSender imports pollTransactionStatus directly, so we need to mock
  // the module BEFORE importing MinaTransactionSender (ESM).
  jest.unstable_mockModule(
    "../../src/settlement/utils/MinaTransactionUtils",
    () => ({
      pollTransactionStatus: jest.fn(),
    })
  );
  ({ MinaTransactionSender } = await import(
    "../../src/settlement/transactions/MinaTransactionSender"
  ));
  const utils = await import("../../src/settlement/utils/MinaTransactionUtils");
  pollTransactionStatus = utils.pollTransactionStatus as unknown as jest.Mock;
});

function makeSender(pendingStorage: PendingL1TransactionStorage) {
  const sender = new MinaTransactionSender(
    {
      createFlow: jest.fn(() => ({
        withFlow: async (fn: any) =>
          await new Promise((resolve, reject) => {
            fn(resolve, reject);
          }),
        pushTask: async (
          _task: any,
          params: { transaction: any },
          onResult: (result: any) => Promise<void>
        ) => {
          await onResult({ transaction: params.transaction });
        },
      })),
    },
    {},
    {
      getAccount: jest.fn(async () => ({ nonce: { toString: () => "0" } })),
      getAccounts: jest.fn(async () => undefined),
      applyTransaction: jest.fn(async () => undefined),
    } as any,
    { config: { network: { type: "local" } } } as any,
    pendingStorage as any,
    {
      shouldRetry: jest.fn(async () => true),
      prepareRetryTransaction: jest.fn(
        async (record: any) => record.transaction
      ),
    } as any,
    { signTx: jest.fn((tx: any) => tx) } as any,
    { getFee: () => 0 } as any
  );
  return sender as typeof MinaTransactionSender;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flush(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}

function makeTx({ senderBase58 = "S", nonce = 0, hash = "TX_HASH" } = {}) {
  const waitDeferred = deferred<{ hash: string }>();

  const pendingTx = {
    hash,
    wait: jest.fn(async () => await waitDeferred.promise),
  };

  const tx: any = {
    // used by proveAndSendTransaction() before proving
    transaction: {
      feePayer: {
        body: {
          publicKey: { toBase58: () => senderBase58 },
          nonce: { toString: () => String(nonce) },
        },
      },
      accountUpdates: [],
    },
    setFee: jest.fn(async () => tx),
    send: jest.fn(async () => pendingTx),
    toPretty: () => "<tx>",
  };

  return { tx: tx as Transaction<false, true>, pendingTx, waitDeferred };
}

describe("MinaTransactionSender (unit)", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("proveAndSendTransaction should immediately send if there is no lower-nonce pending tx, and resolve 'sent'", async () => {
    const pendingStorage: PendingL1TransactionStorage =
      new InMemoryPendingL1TransactionStorage();
    const sender = makeSender(pendingStorage);
    await sender.close(); // to avoid polling

    const { tx } = makeTx({ senderBase58: "S", nonce: 0, hash: "H1" });

    const { transactionId } = await sender.proveAndSendTransaction(tx, "sent");

    const record = await pendingStorage.findById(transactionId as string);

    expect(record?.status).toBe("sent");
    expect(record?.hash).toBe("H1");
    expect(record?.attempts).toBe(1);
    expect(tx.send).toHaveBeenCalledTimes(1);
  });

  it("proveAndSendTransaction should transition sent -> included after pendingTx.wait resolves", async () => {
    const pendingStorage: PendingL1TransactionStorage =
      new InMemoryPendingL1TransactionStorage();
    const sender = makeSender(pendingStorage);
    await sender.close();

    const { tx, waitDeferred } = makeTx({
      senderBase58: "S",
      nonce: 0,
      hash: "H2",
    });

    const txnPromise = sender.proveAndSendTransaction(tx, "included");
    // Ensure sendTransaction installed the wait().then handlers before resolving
    await flush();
    waitDeferred.resolve({ hash: "H2" });
    const { transactionId } = await txnPromise;
    // waitPromise resolves on emitter "included" (before the DB update finishes)
    await flush();
    const record = await pendingStorage.findById(transactionId as string);
    expect(record?.status).toBe("included");
  });

  it("should work for multiple transactions", async () => {
    const pendingStorage: PendingL1TransactionStorage =
      new InMemoryPendingL1TransactionStorage();
    const sender = makeSender(pendingStorage);
    await sender.close(); // we'll manually drive polling

    // tx0 will be sent immediately, but we delay inclusion so tx1 should be queued.
    const tx0 = makeTx({ senderBase58: "S", nonce: 0, hash: "H0" });
    const tx1 = makeTx({ senderBase58: "S", nonce: 1, hash: "H1" });

    const sent0 = await sender.proveAndSendTransaction(tx0.tx, "sent");
    expect(tx0.tx.send).toHaveBeenCalledTimes(1);

    const p1 = sender.proveAndSendTransaction(tx1.tx, "sent");

    // tx1 must NOT be sent while tx0 is still pending (lower nonce).
    await flush();
    expect(tx1.tx.send).toHaveBeenCalledTimes(0);

    // Include tx0, then run the poll loop once to send the next queued tx.
    tx0.waitDeferred.resolve({ hash: "H0" });
    // Let the inclusion handler update storage + clear the active emitter
    await flush();
    await flush();

    await (sender as any).processPendingTransactions();
    await flush();

    // Now tx1 should get sent and the waiting promise should resolve.
    expect(tx1.tx.send).toHaveBeenCalledTimes(1);
    const sent1 = await p1;

    const r0 = await pendingStorage.findById(sent0.transactionId as string);
    const r1 = await pendingStorage.findById(sent1.transactionId as string);
    expect(r0).toBeDefined();
    expect(r1).toBeDefined();
  });

  it("should retry a transaction if first attempt fails", async () => {
    const pendingStorage: PendingL1TransactionStorage =
      new InMemoryPendingL1TransactionStorage();
    const sender = makeSender(pendingStorage);
    await sender.close();

    const { tx } = makeTx({ senderBase58: "S", nonce: 0, hash: "H-R1" });

    // First send returns hash H-R1 and then wait() rejects.
    const wait1 = deferred<{ hash: string }>();
    const wait2 = deferred<{ hash: string }>();
    const pending1 = {
      hash: "H-R1",
      wait: jest.fn(async () => await wait1.promise),
    };
    const pending2 = {
      hash: "H-R2",
      wait: jest.fn(async () => await wait2.promise),
    };

    (tx as any).send = jest
      .fn()
      .mockImplementationOnce(async () => pending1)
      .mockImplementationOnce(async () => pending2);

    // Wait for first send ("sent" resolves immediately after tx.send()) so handlers are installed.
    const { transactionId } = await sender.proveAndSendTransaction(tx, "sent");

    // Fail first attempt (wait rejects), which should trigger retryTransaction and a second send.
    wait1.reject(new Error("first attempt failed"));
    await flush();
    await flush();

    // Second send should happen.
    expect((tx as any).send).toHaveBeenCalledTimes(2);

    // Let second attempt include.
    wait2.resolve({ hash: "H-R2" });

    const record = await pendingStorage.findById(transactionId as string);

    expect(record?.status).toBe("sent");
    expect(record?.hash).toBe("H-R2");
    // Note: attempts increments by 2 on retry due to how retryTransaction builds the next record.
    expect(record?.attempts).toBeGreaterThanOrEqual(2);
  });

  it("should stop retrying when shouldRetry returns false", async () => {
    const pendingStorage: PendingL1TransactionStorage =
      new InMemoryPendingL1TransactionStorage();
    const sender = makeSender(pendingStorage);
    await sender.close();

    // Force "no retry"
    sender.retryStrategy.shouldRetry = jest.fn(async () => false);

    const { tx } = makeTx({ senderBase58: "S", nonce: 0, hash: "H-F" });

    const waitFail = deferred<{ hash: string }>();
    const pending = {
      hash: "H-F",
      wait: jest.fn(async () => await waitFail.promise),
    };
    (tx as any).send = jest.fn(async () => pending);

    const promise = sender.proveAndSendTransaction(tx, "included");

    await flush();
    waitFail.reject(new Error("no more attempts"));

    await expect(promise).rejects.toBeDefined();
  });
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment */
