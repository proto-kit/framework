import { PendingTransaction } from "../../mempool/PendingTransaction";

/**
 * Interface to store Messages previously fetched by a IncomingMessageadapter
 */
export interface MessageStorage {
  pushMessages: (
    fromMessagesHash: string,
    toMessagesHash: string,
    messages: PendingTransaction[]
  ) => Promise<void>;

  getNextMessagesBatch: (fromMessagesHash: string) => Promise<
    | {
        fromMessagesHash: string;
        toMessagesHash: string;
        messages: PendingTransaction[];
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
      messages: PendingTransaction[];
    }[]
  >;
}
