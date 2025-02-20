import {
  DependencyDeclaration,
  DependencyFactory,
  DependencyRecord,
} from "@proto-kit/common";

import { AsyncMerkleTreeStore } from "../state/async/AsyncMerkleTreeStore";
import { StateServiceCreator } from "../state/masking/StateServiceCreator";
import { TreeStoreCreator } from "../state/masking/TreeStoreCreator";

import { BatchStorage } from "./repositories/BatchStorage";
import { BlockQueue, BlockStorage } from "./repositories/BlockStorage";
import { MessageStorage } from "./repositories/MessageStorage";
import { SettlementStorage } from "./repositories/SettlementStorage";
import { TransactionStorage } from "./repositories/TransactionStorage";

export interface StorageDependencyMinimumDependencies extends DependencyRecord {
  batchStorage: DependencyDeclaration<BatchStorage>;
  blockQueue: DependencyDeclaration<BlockQueue>;
  blockStorage: DependencyDeclaration<BlockStorage>;
  blockTreeStore: DependencyDeclaration<AsyncMerkleTreeStore>;
  messageStorage: DependencyDeclaration<MessageStorage>;
  settlementStorage: DependencyDeclaration<SettlementStorage>;
  transactionStorage: DependencyDeclaration<TransactionStorage>;
  stateServiceCreator: DependencyDeclaration<StateServiceCreator>;
  treeStoreCreator: DependencyDeclaration<TreeStoreCreator>;
}

export interface StorageDependencyFactory extends DependencyFactory {
  dependencies: () => StorageDependencyMinimumDependencies;
}
