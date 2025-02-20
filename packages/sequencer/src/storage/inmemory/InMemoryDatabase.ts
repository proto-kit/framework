import { noop } from "@proto-kit/common";

import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { StorageDependencyMinimumDependencies } from "../StorageDependencyFactory";
import { Database } from "../Database";
import { closeable } from "../../sequencer/builder/Closeable";

import { InMemoryBlockStorage } from "./InMemoryBlockStorage";
import { InMemoryBatchStorage } from "./InMemoryBatchStorage";
import { InMemoryMessageStorage } from "./InMemoryMessageStorage";
import { InMemorySettlementStorage } from "./InMemorySettlementStorage";
import { InMemoryTransactionStorage } from "./InMemoryTransactionStorage";
import { InMemoryStateServiceCreator } from "./masking/InMemoryStateServiceCreator";
import { InMemoryTreeStoreCreator } from "./masking/InMemoryTreeStoreCreator";
import { InMemoryBaseMerkleTreeStore } from "./masking/InMemoryMerkleTreeStoreMask";

@sequencerModule()
@closeable()
export class InMemoryDatabase extends SequencerModule implements Database {
  public dependencies(): StorageDependencyMinimumDependencies {
    return {
      batchStorage: {
        useClass: InMemoryBatchStorage,
      },
      blockQueue: {
        useClass: InMemoryBlockStorage,
      },
      blockStorage: {
        useToken: "BlockQueue",
      },
      stateServiceCreator: {
        useClass: InMemoryStateServiceCreator,
      },
      treeStoreCreator: {
        useClass: InMemoryTreeStoreCreator,
      },
      blockTreeStore: {
        useClass: InMemoryBaseMerkleTreeStore,
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
