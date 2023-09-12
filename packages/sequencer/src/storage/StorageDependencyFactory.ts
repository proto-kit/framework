import { inject } from "tsyringe";
import { AsyncMerkleTreeStore } from "@proto-kit/protocol";
import { DependencyFactory, dependencyFactory } from "@proto-kit/common";

import { AsyncStateService } from "../protocol/production/state/AsyncStateService";

import { Database } from "./Database";
import { BlockStorage } from "./repositories/BlockStorage";

export interface StorageDependencyFactory {
  asyncStateService: () => AsyncStateService;
  asyncMerkleStore: () => AsyncMerkleTreeStore;
  blockStorage: () => BlockStorage;
}

@dependencyFactory()
// eslint-disable-next-line import/no-unused-modules
export class DatabaseStorageDependencyFactory extends DependencyFactory {
  public constructor(@inject("Database") private readonly database: Database) {
    super();
  }

  // @dependency()
  // public stateService(): StateService {
  //   return new StateService(this.database)
  // }
}
