import { ComputedBlockTransaction } from "@proto-kit/sequencer";

import {
  PaginatedResult,
  UnprovenBlockPagination,
} from "./UnprovenBlockStorage";

export interface ComputedBlockTransactionWithBlockHash
  extends ComputedBlockTransaction {
  blockHash: string;
}

export interface TransactionFilter {
  hash?: string;
  methodId?: string;
  sender?: string;
  status?: boolean;
}

export interface TransactionPagination extends UnprovenBlockPagination {
  take: number;
  skip?: number;
}

export interface TransactionStorage {
  getTransactions(
    pagination: TransactionPagination,
    filter?: TransactionFilter
  ): Promise<PaginatedResult<ComputedBlockTransactionWithBlockHash>>;
}
