import { noop } from "@proto-kit/common";

import { CachedStateService } from "../../state/state/CachedStateService";
import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { StorageDependencyMinimumDependencies } from "../StorageDependencyFactory";
import { Database } from "../Database";

import { InMemoryBlockStorage } from "./InMemoryBlockStorage";
import { InMemoryAsyncMerkleTreeStore } from "./InMemoryAsyncMerkleTreeStore";
import { InMemoryBatchStorage } from "./InMemoryBatchStorage";
import { InMemoryMessageStorage } from "./InMemoryMessageStorage";
import { InMemorySettlementStorage } from "./InMemorySettlementStorage";
import { InMemoryTransactionStorage } from "./InMemoryTransactionStorage";

@sequencerModule()
export class InMemoryDatabase extends SequencerModule implements Database {
  public dependencies(): StorageDependencyMinimumDependencies {
    return {
      asyncMerkleStore: {
        useClass: InMemoryAsyncMerkleTreeStore,
      },
      asyncStateService: {
        useFactory: () => new CachedStateService(undefined),
      },
      batchStorage: {
        useClass: InMemoryBatchStorage,
      },
      blockQueue: {
        useClass: InMemoryBlockStorage,
      },
      blockStorage: {
        useToken: "BlockQueue",
      },
      unprovenStateService: {
        useFactory: () => new CachedStateService(undefined),
      },
      unprovenMerkleStore: {
        useClass: InMemoryAsyncMerkleTreeStore,
      },
      blockTreeStore: {
        useClass: InMemoryAsyncMerkleTreeStore,
      },
      messageStorage: {
        useClass: InMemoryMessageStorage,
      },
      settlementStorage: {
        useClass: InMemorySettlementStorage,
      },
      transactionStorage: {
        useClass: InMemoryTransactionStorage,
      },
    };
  }

  public async start(): Promise<void> {
    noop();
  }

  public async pruneDatabase(): Promise<void> {
    // Figure out how to implement this nicely.
    // However, this would only be a op when pruneDatabase will be called
    // at some point that is after startup (which we don't do currently)
    noop();
  }

  public async executeInTransaction(f: () => Promise<void>) {
    await f();
  }
}
