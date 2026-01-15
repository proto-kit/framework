import { PendingTransactionJSONType } from "../../mempool/PendingTransaction";

/**
 * Interface to store Messages previously fetched by a IncomingMessageadapter
 */
export interface MessageStorage {
  pushMessages: (
    fromMessagesHash: string,
    toMessagesHash: string,
    messages: PendingTransactionJSONType[]
  ) => Promise<void>;

  getNextMessagesBatch: (fromMessagesHash: string) => Promise<
    | {
        fromMessagesHash: string;
        toMessagesHash: string;
        messages: PendingTransactionJSONType[];
      }
    | undefined
  >;

  getMessageBatches: (
    fromMessagesHash: string,
    toMessagesHash: string
  ) => Promise<
    {
      fromMessagesHash: string;
      toMessagesHash: string;
      messages: PendingTransactionJSONType[];
    }[]
  >;
}
