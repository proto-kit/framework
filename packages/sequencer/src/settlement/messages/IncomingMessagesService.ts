import { inject, injectable } from "tsyringe";
import { ACTIONS_EMPTY_HASH } from "@proto-kit/protocol";

import { SettlementStorage } from "../../storage/repositories/SettlementStorage";
import { MessageStorage } from "../../storage/repositories/MessageStorage";
import { BlockStorage } from "../../storage/repositories/BlockStorage";
import { PendingTransactionJSONType } from "../../mempool/PendingTransaction";
import type { SettlementModule } from "../SettlementModule";
import { PendingTransaction } from "../../mempool/PendingTransaction";
import type { BridgingModule } from "../BridgingModule";

import { IncomingMessageAdapter } from "./IncomingMessageAdapter";

@injectable()
export class IncomingMessagesService {
  public constructor(
    @inject("SettlementStorage")
    private readonly settlementStorage: SettlementStorage,
    @inject("MessageStorage")
    private readonly messageStorage: MessageStorage,
    @inject("IncomingMessageAdapter")
    private readonly messagesAdapter: IncomingMessageAdapter,
    @inject("BlockStorage")
    private readonly blockStorage: BlockStorage,
    @inject("BridgingModule")
    private readonly bridgingModule: BridgingModule
  ) {}

  private async fetchRemaining(
    fromMessagesHash: string,
    toMessagesHash: string
  ) {
    const dispatchContractAddress =
      this.bridgingModule.getDispatchContractAddress();

    const fetched = await this.messagesAdapter.fetchPendingMessages(
      dispatchContractAddress,
      {
        fromActionHash: fromMessagesHash,
        toActionHash: toMessagesHash,
        // TODO For now, until we have access to the action's block height
        fromL1BlockHeight: 0,
      }
    );
    await this.messageStorage.pushMessages(
      fetched.from,
      fetched.to,
      fetched.messages
    );
    return {
      toMessagesHash: fetched.to,
      messages: fetched.messages,
    };
  }

  private isComplete(
    messages:
      | { toMessagesHash: string; messages: PendingTransactionJSONType[] }
      | undefined,
    targetMessagesHash: string
  ) {
    return (
      messages !== undefined && messages.toMessagesHash === targetMessagesHash
    );
  }

  private async ensureMessageCompleteness(
    messages:
      | { toMessagesHash: string; messages: PendingTransactionJSONType[] }
      | undefined,
    fromMessagesHash: string,
    targetMessagesHash: string
  ) {
    if (!this.isComplete(messages, targetMessagesHash)) {
      const from = messages?.toMessagesHash ?? fromMessagesHash;
      const newMessages = await this.fetchRemaining(from, targetMessagesHash);

      if (newMessages.toMessagesHash === targetMessagesHash) {
        return {
          toMessagesHash: newMessages.toMessagesHash,
          messages: (messages?.messages ?? []).concat(newMessages.messages),
        };
      }
      throw new Error(
        `Fetch of actions failed, wanted target ${targetMessagesHash} but got ${newMessages.toMessagesHash}`
      );
    }
    return messages!;
  }

  private aggregateBatches(
    batches: {
      fromMessagesHash: string;
      toMessagesHash: string;
      messages: PendingTransactionJSONType[];
    }[]
  ) {
    return {
      messages: batches.flatMap((batch) => batch.messages),
      toMessagesHash:
        batches.at(-1)?.toMessagesHash ?? ACTIONS_EMPTY_HASH.toString(),
    };
  }

  public async getPendingMessages() {
    const latestSettlement = await this.settlementStorage.getLatestSettlement();
    const latestBlock = await this.blockStorage.getLatestBlock();

    const messagesHashCursor =
      latestBlock?.block?.toMessagesHash?.toString() ??
      ACTIONS_EMPTY_HASH.toString();

    const promisedMessages =
      latestSettlement?.promisedMessagesHash ?? ACTIONS_EMPTY_HASH.toString();

    // If there are any pending L1 messages that aren't yet included in the L2
    if (messagesHashCursor !== promisedMessages) {
      // 1. Check that we have all the necessary messages in storage, if not, fetch
      const storedMessages = await this.messageStorage.getMessageBatches(
        messagesHashCursor,
        promisedMessages
      );

      const completeMessages = await this.ensureMessageCompleteness(
        this.aggregateBatches(storedMessages),
        messagesHashCursor,
        promisedMessages
      );

      return completeMessages.messages;
    }
    return [];
  }
}
