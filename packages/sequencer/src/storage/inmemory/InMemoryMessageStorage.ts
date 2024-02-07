import { injectable } from "tsyringe";

import { PendingTransaction } from "../../mempool/PendingTransaction";
import { MessageStorage } from "../repositories/MessageStorage";

@injectable()
export class InMemoryMessageStorage implements MessageStorage {
  private messages: { [key: string]: PendingTransaction[] } = {}

  public async getMessages(from: string): Promise<PendingTransaction[]> {
    return this.messages[from] ?? [];
  }

  public async pushMessages(from: string, to: string, messages: PendingTransaction[]): Promise<void> {
    this.messages[from] = messages;
  }
}