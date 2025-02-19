import {
  DependencyDeclaration,
  DependencyFactory,
  DependencyRecord,
} from "@proto-kit/common";

import { AsyncMerkleTreeStore } from "../state/async/AsyncMerkleTreeStore";
import { StateServiceCreator } from "../state/StateServiceCreator";

import { BatchStorage } from "./repositories/BatchStorage";
import { BlockQueue, BlockStorage } from "./repositories/BlockStorage";
import { MessageStorage } from "./repositories/MessageStorage";
import { SettlementStorage } from "./repositories/SettlementStorage";
import { TransactionStorage } from "./repositories/TransactionStorage";

export interface StorageDependencyMinimumDependencies extends DependencyRecord {
  asyncMerkleStore: DependencyDeclaration<AsyncMerkleTreeStore>;
  batchStorage: DependencyDeclaration<BatchStorage>;
  blockQueue: DependencyDeclaration<BlockQueue>;
  blockStorage: DependencyDeclaration<BlockStorage>;
  unprovenMerkleStore: DependencyDeclaration<AsyncMerkleTreeStore>;
  blockTreeStore: DependencyDeclaration<AsyncMerkleTreeStore>;
  messageStorage: DependencyDeclaration<MessageStorage>;
  settlementStorage: DependencyDeclaration<SettlementStorage>;
  transactionStorage: DependencyDeclaration<TransactionStorage>;
  stateServiceCreator: DependencyDeclaration<StateServiceCreator>;
}

export interface StorageDependencyFactory extends DependencyFactory {
  dependencies: () => StorageDependencyMinimumDependencies;
}
