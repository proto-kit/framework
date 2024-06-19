import {
  DependencyDeclaration,
  DependencyFactory,
  DependencyRecord,
} from "@proto-kit/common";

import { UnprovenBlockStorage } from "./repositories/UnprovenBlockStorage";
import { TransactionStorage } from "./repositories/TransactionStorage";

export interface StorageDependencyMinimumDependencies extends DependencyRecord {
  unprovenBlockStorage: DependencyDeclaration<UnprovenBlockStorage>;
  transactionStorage: DependencyDeclaration<TransactionStorage>;
}

export interface StorageDependencyFactory extends DependencyFactory {
  dependencies: () => StorageDependencyMinimumDependencies;
}
