import { injectable } from "tsyringe";

import { PendingTransactionJSONType } from "../../mempool/PendingTransaction";
import { MessageStorage } from "../repositories/MessageStorage";

@injectable()
export class InMemoryMessageStorage implements MessageStorage {
  private messages: {
    [key: string]: {
      toMessagesHash: string;
      messages: PendingTransactionJSONType[];
    };
  } = {};

  public async getNextMessagesBatch(fromMessagesHash: string): Promise<
    | {
        fromMessagesHash: string;
        toMessagesHash: string;
        messages: PendingTransactionJSONType[];
      }
    | undefined
  > {
    const batch = this.messages[fromMessagesHash];
    if (batch !== undefined) {
      return {
        ...batch,
        fromMessagesHash,
      };
    }
    return undefined;
  }

  public async getMessageBatches(
    fromMessagesHash: string,
    toMessagesHash: string
  ) {
    const batches: {
      fromMessagesHash: string;
      toMessagesHash: string;
      messages: PendingTransactionJSONType[];
    }[] = [];
    let currentHash = fromMessagesHash;

    while (currentHash !== toMessagesHash) {
      const batch = this.messages[currentHash];

      if (batch === undefined) {
        return batches;
      }

      batches.push({
        ...batch,
        fromMessagesHash: currentHash,
      });
      currentHash = batch.toMessagesHash;
    }

    return batches;
  }

  public async pushMessages(
    fromMessagesHash: string,
    toMessagesHash: string,
    messages: PendingTransactionJSONType[]
  ): Promise<void> {
    this.messages[fromMessagesHash] = {
      messages,
      toMessagesHash,
    };
  }
}
