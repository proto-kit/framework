/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import "reflect-metadata";
import { jest } from "@jest/globals";

import type { PendingL1TransactionStorage } from "../../src/storage/repositories/PendingL1TransactionStorage";
import { InMemoryPendingL1TransactionStorage } from "../../src/storage/inmemory/InMemoryPendingL1TransactionStorage";

let MinaTransactionSender: any;
let L1TransactionDispatcher: any;
let TxStatusWaiter: any;
let checkZkappTransactionStatus: any;

beforeAll(async () => {
  // Capture the mock in this closure so we don't need an extra import just to access it.
  checkZkappTransactionStatus = jest.fn();

  // L1TransactionDispatcher imports checkZkappTransactionStatus directly, so we need to mock
  // the module BEFORE importing MinaTransactionSender (ESM).
  jest.unstable_mockModule(
    "../../src/settlement/transactions/ZkappTransactionStatus",
    () => ({
      checkZkappTransactionStatus,
    })
  );
  ({ MinaTransactionSender } = await import(
    "../../src/settlement/transactions/MinaTransactionSender"
  ));
  ({ L1TransactionDispatcher } = await import(
    "../../src/settlement/transactions/L1TransactionDispatcher"
  ));
  ({ TxStatusWaiter } = await import(
    "../../src/settlement/transactions/TxStatusWaiter"
  ));
});

type SenderFixture = {
  sender: any;
  retryStrategy: any;
};

function makeSender(
  pendingStorage: PendingL1TransactionStorage,
  dispatcherConfig: {
    pollIntervalMs?: number;
    statusCheckIntervalMs?: number;
    inclusionTimeoutMs?: number;
  } = {
    pollIntervalMs: 5,
    statusCheckIntervalMs: 5,
  }
): SenderFixture {
  const flowCreator = {
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
  } as any;

  const provingTask = {} as any;

  const simulator = {
    getAccount: jest.fn(async () => ({ nonce: { toString: () => "0" } })),
    getAccounts: jest.fn(async () => undefined),
    applyTransaction: jest.fn(async () => undefined),
  } as any;

  const baseLayer = { config: { network: { type: "local" } } } as any;

  const retryStrategy = {
    shouldRetry: jest.fn(async () => true),
    prepareRetryTransaction: jest.fn(async (record: any) => record.transaction),
  } as any;

  const signer = { signTx: jest.fn((tx: any) => tx) } as any;
  const feeStrategy = { getFee: () => 0 } as any;

  const waiter = new TxStatusWaiter(pendingStorage as any);
  const dispatcher = new L1TransactionDispatcher(
    pendingStorage as any,
    retryStrategy as any,
    signer as any,
    waiter,
    dispatcherConfig
  );
  const sender = new MinaTransactionSender(
    flowCreator,
    provingTask,
    simulator,
    baseLayer,
    pendingStorage as any,
    signer,
    feeStrategy,
    dispatcher,
    waiter
  );
  return { sender: sender as typeof MinaTransactionSender, retryStrategy };
}

function makeTx({ senderBase58 = "S", nonce = 0, hash = "TX_HASH" } = {}) {
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
    send: jest.fn(async () => ({ hash })),
    toPretty: () => "<tx>",
  };

  return { tx };
}

describe("MinaTransactionSender (unit)", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("proveAndSendTransaction should immediately send if there is no lower-nonce pending tx, and resolve 'sent'", async () => {
    const pendingStorage: PendingL1TransactionStorage =
      new InMemoryPendingL1TransactionStorage();
    const { sender } = makeSender(pendingStorage);
    checkZkappTransactionStatus.mockResolvedValue({ success: false });

    const { tx } = makeTx({ senderBase58: "S", nonce: 0, hash: "H1" });

    try {
      const { transactionId } = await sender.proveAndSendTransaction(
        tx,
        "sent"
      );

      const record = await pendingStorage.findById(transactionId as string);

      expect(record?.status).toBe("sent");
      expect(record?.hash).toBe("H1");
      expect(record?.attempts).toBe(1);
      expect(tx.send).toHaveBeenCalledTimes(1);
    } finally {
      await sender.close();
    }
  });

  it("proveAndSendTransaction should transition sent -> included once the transaction is included", async () => {
    const pendingStorage: PendingL1TransactionStorage =
      new InMemoryPendingL1TransactionStorage();
    const { sender } = makeSender(pendingStorage);
    checkZkappTransactionStatus.mockResolvedValueOnce({ success: true });

    const { tx } = makeTx({ senderBase58: "S", nonce: 0, hash: "H2" });
    try {
      const { transactionId } = await sender.proveAndSendTransaction(
        tx,
        "included"
      );
      const record = await pendingStorage.findById(transactionId as string);
      expect(record?.status).toBe("included");
    } finally {
      await sender.close();
    }
  });

  it("should send multiple nonce-increasing transactions for the same sender", async () => {
    const pendingStorage: PendingL1TransactionStorage =
      new InMemoryPendingL1TransactionStorage();
    const { sender } = makeSender(pendingStorage);
    checkZkappTransactionStatus.mockResolvedValue({ success: false });

    const tx0 = makeTx({ senderBase58: "S", nonce: 0, hash: "H0" });
    const tx1 = makeTx({ senderBase58: "S", nonce: 1, hash: "H1" });

    try {
      const sent0 = await sender.proveAndSendTransaction(tx0.tx, "sent");
      const sent1 = await sender.proveAndSendTransaction(tx1.tx, "sent");

      expect(tx0.tx.send).toHaveBeenCalledTimes(1);
      expect(tx1.tx.send).toHaveBeenCalledTimes(1);

      const r0 = await pendingStorage.findById(sent0.transactionId as string);
      const r1 = await pendingStorage.findById(sent1.transactionId as string);
      expect(r0).toBeDefined();
      expect(r1).toBeDefined();
    } finally {
      await sender.close();
    }
  });

  it("should retry a transaction if first attempt fails", async () => {
    const pendingStorage: PendingL1TransactionStorage =
      new InMemoryPendingL1TransactionStorage();
    const { sender } = makeSender(pendingStorage, {
      pollIntervalMs: 5,
      statusCheckIntervalMs: 0,
      inclusionTimeoutMs: 0,
    });

    const { tx } = makeTx({ senderBase58: "S", nonce: 0, hash: "H-R1" });

    (tx as any).send = jest
      .fn()
      .mockImplementationOnce(async () => ({ hash: "H-R1" }))
      .mockImplementationOnce(async () => ({ hash: "H-R2" }));

    checkZkappTransactionStatus
      .mockResolvedValueOnce({ success: false })
      .mockResolvedValueOnce({ success: true });

    try {
      const { transactionId } = await sender.proveAndSendTransaction(
        tx,
        "included"
      );
      const record = await pendingStorage.findById(transactionId as string);

      expect((tx as any).send).toHaveBeenCalledTimes(2);
      expect(record?.status).toBe("included");
      expect(record?.hash).toBe("H-R2");
      expect(record?.attempts).toBeGreaterThanOrEqual(2);
    } finally {
      await sender.close();
    }
  });

  it("should stop retrying when shouldRetry returns false", async () => {
    const pendingStorage: PendingL1TransactionStorage =
      new InMemoryPendingL1TransactionStorage();
    const { sender, retryStrategy } = makeSender(pendingStorage, {
      pollIntervalMs: 5,
      statusCheckIntervalMs: 0,
      inclusionTimeoutMs: 0,
    });

    // Force "no retry"
    retryStrategy.shouldRetry = jest.fn(async () => false);

    checkZkappTransactionStatus.mockResolvedValueOnce({ success: false });
    const { tx } = makeTx({ senderBase58: "S", nonce: 0, hash: "H-F" });
    try {
      const promise = sender.proveAndSendTransaction(tx, "included");
      await expect(promise).rejects.toBeDefined();
    } finally {
      await sender.close();
    }
  });
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment */
