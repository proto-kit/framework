import { PendingTransaction } from "../../mempool/PendingTransaction";

/**
 * Interface to store Messages previously fetched by a IncomingMessageadapter
 */
export interface MessageStorage {
  pushMessages: (
    from: string,
    to: string,
    messages: PendingTransaction[]
  ) => Promise<void>;
  getMessages: (from: string) => Promise<PendingTransaction[]>;
}
