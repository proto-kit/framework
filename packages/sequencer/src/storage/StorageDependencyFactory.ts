import { DependencyDeclaration, DependencyRecord } from "@proto-kit/common";

import { AsyncStateService } from "../state/async/AsyncStateService";
import { AsyncLinkedLeafStore } from "../state/async/AsyncLinkedLeafStore";
import { AsyncMerkleTreeStore } from "../state/async/AsyncMerkleTreeStore";

import { BatchStorage } from "./repositories/BatchStorage";
import { BlockQueue, BlockStorage } from "./repositories/BlockStorage";
import { MessageStorage } from "./repositories/MessageStorage";
import { SettlementStorage } from "./repositories/SettlementStorage";
import { TransactionStorage } from "./repositories/TransactionStorage";

export interface StorageDependencyMinimumDependencies<Module>
  extends DependencyRecord<Module> {
  asyncStateService: DependencyDeclaration<AsyncStateService, Module>;
  asyncLinkedLeafStore: DependencyDeclaration<AsyncLinkedLeafStore, Module>;

  unprovenStateService: DependencyDeclaration<AsyncStateService, Module>;
  unprovenLinkedLeafStore: DependencyDeclaration<AsyncLinkedLeafStore, Module>;

  batchStorage: DependencyDeclaration<BatchStorage, Module>;
  blockQueue: DependencyDeclaration<BlockQueue, Module>;
  blockStorage: DependencyDeclaration<BlockStorage, Module>;
  blockTreeStore: DependencyDeclaration<AsyncMerkleTreeStore, Module>;
  messageStorage: DependencyDeclaration<MessageStorage, Module>;
  settlementStorage: DependencyDeclaration<SettlementStorage, Module>;
  transactionStorage: DependencyDeclaration<TransactionStorage, Module>;
}

export interface DatabaseDependencyFactory {
  dependencies(): StorageDependencyMinimumDependencies<unknown>;
}
