import {
  DependencyDeclaration,
  DependencyFactory,
  DependencyRecord,
} from "@proto-kit/common";

import { AsyncStateService } from "../state/async/AsyncStateService";
import { AsyncLinkedLeafStore } from "../state/async/AsyncLinkedLeafStore";
import { AsyncMerkleTreeStore } from "../state/async/AsyncMerkleTreeStore";

import { BatchStorage } from "./repositories/BatchStorage";
import { BlockQueue, BlockStorage } from "./repositories/BlockStorage";
import { MessageStorage } from "./repositories/MessageStorage";
import { PendingL1TransactionStorage } from "./repositories/PendingL1TransactionStorage";
import { SettlementStorage } from "./repositories/SettlementStorage";
import { TransactionStorage } from "./repositories/TransactionStorage";

export interface StorageDependencyMinimumDependencies extends DependencyRecord {
  asyncStateService: DependencyDeclaration<AsyncStateService>;
  asyncLinkedLeafStore: DependencyDeclaration<AsyncLinkedLeafStore>;

  unprovenStateService: DependencyDeclaration<AsyncStateService>;
  unprovenLinkedLeafStore: DependencyDeclaration<AsyncLinkedLeafStore>;

  batchStorage: DependencyDeclaration<BatchStorage>;
  blockQueue: DependencyDeclaration<BlockQueue>;
  blockStorage: DependencyDeclaration<BlockStorage>;
  blockTreeStore: DependencyDeclaration<AsyncMerkleTreeStore>;
  messageStorage: DependencyDeclaration<MessageStorage>;
  settlementStorage: DependencyDeclaration<SettlementStorage>;
  transactionStorage: DependencyDeclaration<TransactionStorage>;
  pendingL1TransactionStorage: DependencyDeclaration<PendingL1TransactionStorage>;
}

export interface StorageDependencyFactory extends DependencyFactory {
  dependencies: () => StorageDependencyMinimumDependencies;
}
