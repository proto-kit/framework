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
import { InMemoryStateService } from "@proto-kit/module";

@sequencerModule()
export class InMemoryDatabase
  extends SequencerModule
  implements StorageDependencyFactory
{
  private readonly blockStorageQueue = new InMemoryBlockStorage();

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
        useValue: this.blockStorageQueue,
      },
      unprovenBlockStorage: {
        useValue: this.blockStorageQueue,
      },
      unprovenStateService: {
        useFactory: () => new CachedStateService(undefined),
      },
      unprovenMerkleStore: {
        useClass: InMemoryAsyncMerkleTreeStore,
      },
    };
  }

  public async start(): Promise<void> {
    noop();
  }
}
