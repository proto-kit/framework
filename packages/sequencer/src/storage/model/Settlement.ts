export interface Settlement {
  // transaction: string;
  // TODO Re-add some way to link dispatched L1 transactions with proven and sent txs
  // transactionHash: string;
  promisedMessagesHash: string;
  batches: number[];
}
