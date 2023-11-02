import { inject } from "tsyringe";
import { DependencyFactory, dependencyFactory } from "@proto-kit/common";

import { AsyncStateService } from "../state/async/AsyncStateService";
import { AsyncMerkleTreeStore } from "../state/async/AsyncMerkleTreeStore";

import { Database } from "./Database";
import { BlockStorage } from "./repositories/BlockStorage";
import { CachedStateService } from "../state/state/CachedStateService";

export interface StorageDependencyFactory {
  asyncStateService: () => AsyncStateService;
  asyncMerkleStore: () => AsyncMerkleTreeStore;
  unprovenStateService: () => CachedStateService;
  blockStorage: () => BlockStorage;
}

@dependencyFactory()
export class DatabaseStorageDependencyFactory extends DependencyFactory {
  public constructor(@inject("Database") private readonly database: Database) {
    super();
  }

  // @dependency()
  // public stateService(): StateService {
  //   return new StateService(this.database)
  // }
}
