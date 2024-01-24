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

@sequencerModule()
export class InMemoryDatabase
  extends SequencerModule
  implements StorageDependencyFactory
{
  private readonly asyncService = new CachedStateService(undefined);

  private readonly merkleStore = new InMemoryAsyncMerkleTreeStore();

  private readonly blockStorageQueue = new InMemoryBlockStorage();

  public dependencies(): StorageDependencyMinimumDependencies {
    return {
      asyncMerkleStore: {
        useValue: this.merkleStore,
      },
      asyncStateService: {
        useValue: this.asyncService,
      },
      blockStorage: {
        useClass: InMemoryBatchStorage,
      },
      unprovenBlockQueue: {
        useValue: this.blockStorageQueue,
      },
      unprovenBlockStorage: {
        useValue: this.blockStorageQueue,
      },
      unprovenStateService: {
        useFactory: () => new CachedStateService(this.asyncService),
      },
      unprovenMerkleStore: {
        useFactory: () => new CachedMerkleTreeStore(this.merkleStore),
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
    };
  }

  public async start(): Promise<void> {
    noop();
  }
}
