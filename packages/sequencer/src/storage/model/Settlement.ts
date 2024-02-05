export interface Settlement {
  // transaction: string;
  transactionHash: string;
  promisedMessagesHash: string;
  batches: number[];
}
