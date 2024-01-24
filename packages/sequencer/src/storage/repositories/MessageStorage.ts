import { PendingTransaction } from "../../mempool/PendingTransaction";

export interface MessageStorage {
  pushMessages: (
    from: string,
    to: string,
    messages: PendingTransaction[]
  ) => Promise<void>;
  getMessages: (from: string) => Promise<PendingTransaction[]>;
}
