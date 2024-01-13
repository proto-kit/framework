import {
  DependencyDeclaration,
  DependencyFactory,
  DependencyRecord,
} from "@proto-kit/common";

import { AsyncStateService } from "../state/async/AsyncStateService";
import { AsyncMerkleTreeStore } from "../state/async/AsyncMerkleTreeStore";

import { BlockStorage } from "./repositories/BlockStorage";
import {
  UnprovenBlockQueue,
  UnprovenBlockStorage,
} from "./repositories/UnprovenBlockStorage";

export interface StorageDependencyMinimumDependencies extends DependencyRecord {
  asyncStateService: DependencyDeclaration<AsyncStateService>;
  asyncMerkleStore: DependencyDeclaration<AsyncMerkleTreeStore>;
  blockStorage: DependencyDeclaration<BlockStorage>;
  unprovenBlockQueue: DependencyDeclaration<UnprovenBlockQueue>;
  unprovenBlockStorage: DependencyDeclaration<UnprovenBlockStorage>;
  unprovenStateService: DependencyDeclaration<AsyncStateService>;
  unprovenMerkleStore: DependencyDeclaration<AsyncMerkleTreeStore>;
  blockTreeStore: DependencyDeclaration<AsyncMerkleTreeStore>;
}

export interface StorageDependencyFactory extends DependencyFactory {
  dependencies: () => StorageDependencyMinimumDependencies;
}
