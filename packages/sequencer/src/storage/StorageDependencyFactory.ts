import { inject } from "tsyringe";
import { DependencyFactory, dependencyFactory } from "@proto-kit/common";

import { AsyncStateService } from "../state/async/AsyncStateService";
import { AsyncMerkleTreeStore } from "../state/async/AsyncMerkleTreeStore";

import { Database } from "./Database";
import { BlockStorage } from "./repositories/BlockStorage";

export interface StorageDependencyFactory {
  asyncStateService: () => AsyncStateService;
  asyncMerkleStore: () => AsyncMerkleTreeStore;
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
