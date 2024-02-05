import { injectable } from "tsyringe";

import { PendingTransaction } from "../../mempool/PendingTransaction";
import { MessageStorage } from "../repositories/MessageStorage";

@injectable()
export class InMemoryMessageStorage implements MessageStorage {
  private messages: { [key: string]: PendingTransaction[] } = {};

  public async getMessages(
    fromMessagesHash: string
  ): Promise<PendingTransaction[]> {
    return this.messages[fromMessagesHash] ?? [];
  }

  public async pushMessages(
    fromMessagesHash: string,
    toMessagesHash: string,
    messages: PendingTransaction[]
  ): Promise<void> {
    this.messages[fromMessagesHash] = messages;
  }
}
