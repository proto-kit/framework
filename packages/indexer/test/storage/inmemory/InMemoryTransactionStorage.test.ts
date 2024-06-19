import "reflect-metadata";
import { Bool, Field, PrivateKey, Signature, UInt64 } from "o1js";
import {
  PendingTransaction,
  UnprovenBlockWithMetadata,
} from "@proto-kit/sequencer";

import { InMemoryUnprovenBlockStorage } from "../../../src/storage/inmemory/InMemoryUnprovenBlockStorage";
import { InMemoryTransactionStorage } from "../../../src/storage/inmemory/InMemoryTransactionStorage";

const { block } = UnprovenBlockWithMetadata.createEmpty();
const alice = PrivateKey.random().toPublicKey();
const bob = PrivateKey.random().toPublicKey();

function mockTransactionExecutionResult(index: number) {
  const isOdd = index % 2 === 0;

  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    stateTransitions: [] as any,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    protocolTransitions: [] as any,
    status: Bool(isOdd),
    tx: new PendingTransaction({
      methodId: Field(index),
      nonce: UInt64.from(index),
      sender: isOdd ? alice : bob,
      signature: {} as Signature,
      argsFields: [],
      argsJSON: [],
      isMessage: false,
    }),
  };
}

describe("InMemoryTransactionStorage", () => {
  const unprovenBlockStorage = new InMemoryUnprovenBlockStorage();
  const transactionStorage = new InMemoryTransactionStorage(
    unprovenBlockStorage
  );

  beforeAll(async () => {
    for (let i = 0; i < 10; i++) {
      await unprovenBlockStorage.pushBlock({
        block: {
          ...block,
          hash: Field(i),
          height: Field(i),
          transactions: [mockTransactionExecutionResult(i)],
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        metadata: {} as any,
      });
    }
  });

  it("should get all transactions", async () => {
    const txs = await transactionStorage.getTransactions({
      take: 100,
    });

    expect(txs.totalCount).toBe(10);
    expect(txs.items.length).toBe(10);
  });

  it("should get all transactions", async () => {
    const txs = await transactionStorage.getTransactions({
      take: 100,
    });

    expect(txs.totalCount).toBe(10);
    expect(txs.items.length).toBe(10);
  });

  it("should filter transactions by sender", async () => {
    const txs = await transactionStorage.getTransactions(
      {
        take: 100,
      },
      {
        sender: alice.toBase58(),
      }
    );

    expect(txs.totalCount).toBe(5);
    expect(txs.items.length).toBe(5);
  });

  it("should filter transactions by status and sender", async () => {
    const txs = await transactionStorage.getTransactions(
      {
        take: 100,
      },
      {
        status: true,
        sender: alice.toBase58(),
      }
    );

    expect(txs.totalCount).toBe(5);
    expect(txs.items.length).toBe(5);
  });
});
