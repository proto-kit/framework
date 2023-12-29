/* eslint-disable ext/lines-between-object-properties */
import {
  InMemoryMerkleTreeStorage,
  StateServiceProvider,
  StateTransitionWitnessProviderReference,
} from "@proto-kit/protocol";
import { DependencyFactory, noop } from "@proto-kit/common";

import { AsyncMerkleTreeStore } from "../../state/async/AsyncMerkleTreeStore";
import { CachedStateService } from "../../state/state/CachedStateService";
import { AsyncStateService } from "../../state/async/AsyncStateService";
import {
  UnprovenBlock,
  UnprovenBlockMetadata,
} from "../../protocol/production/unproven/TransactionExecutionService";
import { CachedMerkleTreeStore } from "../../state/merkle/CachedMerkleTreeStore";
import { UnprovenBlockWithPreviousMetadata } from "../../protocol/production/BlockProducerModule";

import {
  StorageDependencyFactory,
  StorageDependencyMinimumDependencies,
} from "../StorageDependencyFactory";
import {
  BlockStorage,
  HistoricalBlockStorage,
} from "../repositories/BlockStorage";
import { ComputedBlock } from "../model/Block";
import {
  HistoricalUnprovenBlockStorage,
  UnprovenBlockQueue,
  UnprovenBlockStorage,
} from "../repositories/UnprovenBlockStorage";
import { InMemoryBlockStorage } from "./InMemoryBlockStorage";
import { InMemoryAsyncMerkleTreeStore } from "./InMemoryAsyncMerkleTreeStore";
import { InMemoryBatchStorage } from "./InMemoryBatchStorage";

export class InMemoryDatabase implements StorageDependencyFactory {
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
      stateServiceProvider: {
        useFactory: () => new StateServiceProvider(this.asyncService),
      },
      stateTransitionWitnessProviderReference: {
        useClass: StateTransitionWitnessProviderReference,
      },
      unprovenStateService: {
        useFactory: () => new CachedStateService(this.asyncService),
      },
      unprovenMerkleStore: {
        useFactory: () => new CachedMerkleTreeStore(this.merkleStore),
      },
    };
  }
}
