export interface Settlement {
  transactionId: string;
  promisedMessagesHash: string;
  batches: number[];
}
