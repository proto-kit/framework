import {
  DependencyFactory,
  dependencyFactory
} from "../sequencer/builder/DependencyFactory";
import { inject } from "tsyringe";
import { Database } from "./Database";
import { AsyncStateService } from "../protocol/production/state/AsyncStateService";
import { AsyncMerkleTreeStore } from "@yab/protocol";
import { BlockStorage } from "./repositories/BlockStorage";

export interface StorageDependencyFactory {
  asyncStateService: () => AsyncStateService;
  asyncMerkleStore: () => AsyncMerkleTreeStore;
  blockStore: () => BlockStorage
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