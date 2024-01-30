/* eslint-disable ext/lines-between-object-properties */
import { noop } from "@proto-kit/common";

import { CachedStateService } from "../../state/state/CachedStateService";
import { CachedMerkleTreeStore } from "../../state/merkle/CachedMerkleTreeStore";
import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import {
  StorageDependencyFactory,
  StorageDependencyMinimumDependencies,
} from "../StorageDependencyFactory";

import { InMemoryBlockStorage } from "./InMemoryBlockStorage";
import { InMemoryAsyncMerkleTreeStore } from "./InMemoryAsyncMerkleTreeStore";
import { InMemoryBatchStorage } from "./InMemoryBatchStorage";
import { InMemoryMessageStorage } from "./InMemoryMessageStorage";
import { InMemorySettlementStorage } from "./InMemorySettlementStorage";
import { InMemoryStateService } from "@proto-kit/module";
import { InMemoryTransactionStorage } from "./InMemoryTransactionStorage";
import { InMemoryTransactionRepository } from "./InMemoryTransactionRepository";

@sequencerModule()
export class InMemoryDatabase
  extends SequencerModule
  implements StorageDependencyFactory
{
  public dependencies(): StorageDependencyMinimumDependencies {
    return {
      asyncMerkleStore: {
        useClass: InMemoryAsyncMerkleTreeStore,
      },
      asyncStateService: {
        useFactory: () => new CachedStateService(undefined),
      },
      blockStorage: {
        useClass: InMemoryBatchStorage,
      },
      unprovenBlockQueue: {
        useClass: InMemoryBlockStorage,
      },
      unprovenBlockStorage: {
        useToken: "UnprovenBlockQueue",
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
      transactionRepository: {
        useClass: InMemoryTransactionRepository
      }
    };
  }

  public async start(): Promise<void> {
    noop();
  }
}
