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
  getMessages: (fromMessagesHash: string) => Promise<PendingTransaction[]>;
}
