import { IndexerModule } from "../../IndexerModule";
import {
  StorageDependencyFactory,
  StorageDependencyMinimumDependencies,
} from "../StorageDependencyFactory";

import { InMemoryUnprovenBlockStorage } from "./InMemoryUnprovenBlockStorage";
import { InMemoryTransactionStorage } from "./InMemoryTransactionStorage";

export class InMemoryDatabase
  extends IndexerModule<object>
  implements StorageDependencyFactory
{
  public dependencies(): StorageDependencyMinimumDependencies {
    return {
      unprovenBlockStorage: {
        useClass: InMemoryUnprovenBlockStorage,
      },
      transactionStorage: {
        useClass: InMemoryTransactionStorage,
      },
    };
  }

  public start(): Promise<void> {
    return Promise.resolve();
  }
}
