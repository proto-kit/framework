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
import { MessageStorage } from "./repositories/MessageStorage";
import { SettlementStorage } from "./repositories/SettlementStorage";
import { TransactionStorage } from "./repositories/TransactionStorage";

export interface StorageDependencyMinimumDependencies extends DependencyRecord {
  asyncStateService: DependencyDeclaration<AsyncStateService>;
  asyncMerkleStore: DependencyDeclaration<AsyncMerkleTreeStore>;
  blockStorage: DependencyDeclaration<BlockStorage>;
  unprovenBlockQueue: DependencyDeclaration<UnprovenBlockQueue>;
  unprovenBlockStorage: DependencyDeclaration<UnprovenBlockStorage>;
  unprovenStateService: DependencyDeclaration<AsyncStateService>;
  unprovenMerkleStore: DependencyDeclaration<AsyncMerkleTreeStore>;
  blockTreeStore: DependencyDeclaration<AsyncMerkleTreeStore>;
  messageStorage: DependencyDeclaration<MessageStorage>;
  settlementStorage: DependencyDeclaration<SettlementStorage>;
  transactionStorage: DependencyDeclaration<TransactionStorage>;
}

export interface StorageDependencyFactory extends DependencyFactory {
  dependencies: () => StorageDependencyMinimumDependencies;
}
