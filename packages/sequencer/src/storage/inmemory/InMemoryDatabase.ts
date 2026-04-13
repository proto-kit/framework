import { dependencyFactory, noop } from "@proto-kit/common";

import { CachedStateService } from "../../state/state/CachedStateService";
import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { StorageDependencyMinimumDependencies } from "../StorageDependencyFactory";
import { Database } from "../Database";
import { closeable } from "../../sequencer/builder/Closeable";

import { InMemoryBlockStorage } from "./InMemoryBlockStorage";
import { InMemoryAsyncLinkedLeafStore } from "./InMemoryAsyncLinkedLeafStore";
import { InMemoryBatchStorage } from "./InMemoryBatchStorage";
import { InMemoryMessageStorage } from "./InMemoryMessageStorage";
import { InMemorySettlementStorage } from "./InMemorySettlementStorage";
import { InMemoryTransactionStorage } from "./InMemoryTransactionStorage";
import { InMemoryAsyncMerkleTreeStore } from "./InMemoryAsyncMerkleTreeStore";

@sequencerModule()
@closeable()
@dependencyFactory()
export class InMemoryDatabase extends SequencerModule implements Database {
  public static dependencies(): StorageDependencyMinimumDependencies<InMemoryDatabase> {
    return {
      asyncLinkedLeafStore: {
        useClass: InMemoryAsyncLinkedLeafStore,
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
      unprovenLinkedLeafStore: {
        useClass: InMemoryAsyncLinkedLeafStore,
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
      unprovenTreeStore: {
        useClass: InMemoryAsyncMerkleTreeStore,
      },
      asyncTreeStore: {
        useClass: InMemoryAsyncMerkleTreeStore,
      },
      treeDatabase: {
        useToken: "Database",
      },
    };
  }

  public async start(): Promise<void> {
    noop();
  }

  public async close() {
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
