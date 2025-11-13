import { Bool, Field } from "o1js";

import { PendingTransaction } from "../../mempool/PendingTransaction";

/**
 * Simplified transaction result for client consumption.
 * Contains only the essential fields returned by the GraphQL API.
 */
export interface ClientTransactionResult {
  tx: PendingTransaction;
  status: Bool;
  statusMessage?: string;
}

/**
 * Client-facing block type with simplified transaction data.
 * This matches what the GraphQL API returns.
 */
export interface ClientBlock {
  hash: Field;
  previousBlockHash: Field | undefined;
  height: Field;
  transactions: ClientTransactionResult[];
  transactionsHash: Field;
}

export interface BlockExplorerTransportModule {
  fetchTxInclusion(txHash: string): Promise<string>;
  getBlock(
    param: { hash: string } | { height: number }
  ): Promise<ClientBlock | undefined>;
}
