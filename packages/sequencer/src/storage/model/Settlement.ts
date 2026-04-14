export interface Settlement {
  transactionHash: string;
  promisedMessagesHash: string;
  batches: number[];
  createdAt: Date;
}
