import "reflect-metadata";

import { describe, it, expect, afterEach, jest } from "@jest/globals";
import { PrivateKey, Mina, UInt64, UInt32 } from "o1js";

import type { MinaBaseLayer } from "../../src/protocol/baselayer/MinaBaseLayer";
import type { MinaSigner } from "../../src/settlement/MinaSigner";
import type { L1TransactionRetryStrategy } from "../../src/settlement/transactions/L1TransactionRetryStrategy";
import type { DispatcherConfig } from "../../src/settlement/transactions/L1TransactionDispatcher";
import type { FlowCreator } from "../../src/worker/flow/Flow";
import type { SettlementProvingTask } from "../../src/settlement/tasks/SettlementProvingTask";
import type { MinaTransactionSimulator } from "../../src/settlement/transactions/MinaTransactionSimulator";
import type { FeeStrategy } from "../../src/protocol/baselayer/fees/FeeStrategy";

// Mock checkZkappTransactionStatus BEFORE importing dispatcher
const mockCheckZkappTransactionStatus =
  jest.fn<
    () => Promise<{ success: boolean; failureReason: string[] | null }>
  >();

jest.unstable_mockModule(
  "../../src/settlement/transactions/ZkappTransactionStatus",
  () => ({
    checkZkappTransactionStatus: mockCheckZkappTransactionStatus,
  })
);

// Dynamic imports after mock
const { L1TransactionDispatcher } = await import(
  "../../src/settlement/transactions/L1TransactionDispatcher"
);
const { MinaTransactionSender } = await import(
  "../../src/settlement/transactions/MinaTransactionSender"
);
const { TxStatusWaiter } = await import(
  "../../src/settlement/transactions/TxStatusWaiter"
);
const { InMemoryPendingL1TransactionStorage } = await import(
  "../../src/storage/inmemory/InMemoryPendingL1TransactionStorage"
);

// Mock Mina.Transaction.hash
// @ts-expect-error - mocking static method
Mina.Transaction.hash = jest.fn(async (txJson: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const parsed = JSON.parse(txJson);
  return `hash-${parsed?.feePayer?.body?.nonce ?? "0"}`;
});

// Fixed sender key for all tests
const senderKey = PrivateKey.random();
const senderBase58 = senderKey.toPublicKey().toBase58();

// Stateless mocks (shared across tests)
const dispatcherConfig: Required<DispatcherConfig> = {
  pollIntervalMs: 100_000_000, // No polling
  statusCheckIntervalMs: 10,
  inclusionTimeoutMs: 100,
};

const mockBaseLayer: MinaBaseLayer = {
  isLocalBlockChain: () => false,
  config: { network: { type: "remote", graphql: "x", archive: "x" } },
} as unknown as MinaBaseLayer;

const mockSigner: MinaSigner = {
  signTx: (tx: any) => tx,
} as unknown as MinaSigner;

const mockRetryStrategy: L1TransactionRetryStrategy = {
  shouldRetry: async (r) => r.attempts < 3,
  getRetryDelayMs: () => 0,
  prepareRetryTransaction: async (r) =>
    r.transaction as unknown as Mina.Transaction<any, false>,
};

const mockSimulator: MinaTransactionSimulator = {
  getAccount: async () => ({ nonce: UInt32.from(0) }),
  getAccounts: async () => [],
  applyTransaction: async () => {},
} as unknown as MinaTransactionSimulator;

const mockFeeStrategy: FeeStrategy = { getFee: () => 1e9 };
const mockProvingTask = {} as SettlementProvingTask;

/** Create a minimal mock transaction */
function createMockTx(nonce: number) {
  const pubKey = senderKey.toPublicKey();
  const mockSend = jest
    .fn<() => Promise<{ hash: string }>>()
    .mockResolvedValue({ hash: `tx-hash-${nonce}` });

  return {
    transaction: {
      feePayer: {
        body: {
          publicKey: pubKey,
          nonce: UInt32.from(nonce),
          fee: UInt64.from(1e9),
        },
      },
      accountUpdates: [],
    },
    send: mockSend,
    toJSON: () =>
      JSON.stringify({
        feePayer: { body: { publicKey: pubKey.toBase58(), nonce: `${nonce}` } },
      }),
  } as unknown as Mina.Transaction<any, any>;
}

/** Create a mock FlowCreator that immediately resolves proving */
function createMockFlowCreator(
  getProvenTx: () => Mina.Transaction<any, any>
): FlowCreator {
  return {
    createFlow: () => ({
      withFlow: async <T>(
        executor: (resolve: (v: T) => void, reject: (e: Error) => void) => void
      ) =>
        await new Promise<T>((res, rej) => {
          executor(res, rej);
        }),
      pushTask: async (_task: unknown, _input: unknown, callback: Function) => {
        callback({ transaction: getProvenTx() });
      },
    }),
  } as unknown as FlowCreator;
}

/** Create fresh test context (storage, dispatcher, waiter, sender) */
function createTestContext(
  retryStrategy: L1TransactionRetryStrategy = mockRetryStrategy,
  flowCreator?: FlowCreator
) {
  const storage = new InMemoryPendingL1TransactionStorage();
  const waiter = new TxStatusWaiter(storage);
  const dispatcher = new L1TransactionDispatcher(
    storage,
    retryStrategy,
    mockSigner,
    waiter,
    dispatcherConfig,
    mockBaseLayer
  );

  const provenTx = createMockTx(0);
  const sender = new MinaTransactionSender(
    flowCreator ?? createMockFlowCreator(() => provenTx),
    mockProvingTask,
    mockSimulator,
    mockBaseLayer,
    storage,
    mockSigner,
    mockFeeStrategy,
    dispatcher,
    waiter
  );

  return { storage, waiter, dispatcher, sender, provenTx };
}

describe("MinaTransactionSender", () => {
  const contexts: Array<{
    sender: InstanceType<typeof MinaTransactionSender>;
  }> = [];

  afterEach(async () => {
    jest.clearAllMocks();
    await Promise.all(contexts.map((c) => c.sender.close()));
    contexts.length = 0;
  });

  function useContext(
    retryStrategy?: L1TransactionRetryStrategy,
    flowCreator?: FlowCreator
  ) {
    const ctx = createTestContext(retryStrategy, flowCreator);
    contexts.push(ctx);
    return ctx;
  }

  it("should send transaction and resolve 'sent'", async () => {
    const { sender, storage, provenTx } = useContext();
    const inputTx = createMockTx(0);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const result = await sender.proveAndSendTransaction(inputTx as any, "sent");

    expect(result.transactionId).toBeDefined();
    const record = await storage.findById(result.transactionId);
    expect(record!.status).toBe("sent");
    expect(provenTx.send).toHaveBeenCalledTimes(1);
  });

  it("should transition sent -> included when status check succeeds", async () => {
    mockCheckZkappTransactionStatus.mockResolvedValue({
      success: true,
      failureReason: null,
    });

    const { sender, storage, waiter, dispatcher } = useContext();
    const inputTx = createMockTx(0);

    const result = await sender.proveAndSendTransaction(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      inputTx as any,
      "queued"
    );

    await waiter.waitFor(result.transactionId, "sent", { timeoutMs: 1000 });
    dispatcher.requestDispatch(senderBase58);
    await waiter.waitFor(result.transactionId, "included", { timeoutMs: 1000 });

    const record = await storage.findById(result.transactionId);
    expect(record!.status).toBe("included");
  });

  it("should send multiple nonce-increasing transactions", async () => {
    const tx0 = createMockTx(0);
    const tx1 = createMockTx(1);
    const tx2 = createMockTx(2);

    let txIndex = 0;
    const provenTxs = [tx0, tx1, tx2];
    const flowCreator = createMockFlowCreator(() => provenTxs[txIndex++]);
    const { sender } = useContext(undefined, flowCreator);

    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    await Promise.all([
      sender.proveAndSendTransaction(tx0 as any, "sent"),
      sender.proveAndSendTransaction(tx1 as any, "sent"),
      sender.proveAndSendTransaction(tx2 as any, "sent"),
    ]);
    /* eslint-enable @typescript-eslint/no-unsafe-argument */

    expect(tx0.send).toHaveBeenCalledTimes(1);
    expect(tx1.send).toHaveBeenCalledTimes(1);
    expect(tx2.send).toHaveBeenCalledTimes(1);
  });

  it("should retry when status check fails", async () => {
    let callCount = 0;
    mockCheckZkappTransactionStatus.mockImplementation(async () => {
      callCount++;
      return callCount === 1
        ? { success: false, failureReason: ["error"] }
        : { success: true, failureReason: null };
    });

    const { sender, storage, waiter, dispatcher } = useContext();
    const inputTx = createMockTx(0);

    const result = await sender.proveAndSendTransaction(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      inputTx as any,
      "queued"
    );

    await waiter.waitFor(result.transactionId, "sent", { timeoutMs: 1000 });

    // First check fails, triggers retry
    dispatcher.requestDispatch(senderBase58);
    await new Promise((r) => {
      setTimeout(r, 50);
    });

    // Second check succeeds
    dispatcher.requestDispatch(senderBase58);
    await waiter.waitFor(result.transactionId, "included", { timeoutMs: 1000 });

    const record = await storage.findById(result.transactionId);
    expect(record!.status).toBe("included");
    expect(record!.attempts).toBeGreaterThanOrEqual(2);
  });

  it("should stop retrying when shouldRetry returns false", async () => {
    mockCheckZkappTransactionStatus.mockResolvedValue({
      success: false,
      failureReason: ["permanent error"],
    });

    const noRetryStrategy: L1TransactionRetryStrategy = {
      shouldRetry: async () => false,
      getRetryDelayMs: () => 0,
      prepareRetryTransaction: async (r) =>
        r.transaction as unknown as Mina.Transaction<any, false>,
    };

    const { sender, storage, waiter, dispatcher } = useContext(noRetryStrategy);
    const inputTx = createMockTx(0);

    const result = await sender.proveAndSendTransaction(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      inputTx as any,
      "queued"
    );

    await waiter.waitFor(result.transactionId, "sent", { timeoutMs: 1000 });
    dispatcher.requestDispatch(senderBase58);

    await expect(
      waiter.waitFor(result.transactionId, "included", { timeoutMs: 500 })
    ).rejects.toThrow();

    const record = await storage.findById(result.transactionId);
    expect(record!.status).toBe("failed");
  });
});
