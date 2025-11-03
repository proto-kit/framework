import { inject, injectable } from "tsyringe";
import { OutgoingMessageEvent } from "@proto-kit/protocol";
import { filterNonUndefined } from "@proto-kit/common";

import { Block } from "../../../storage/model/Block";
import { BlockStorage } from "../../../storage/repositories/BlockStorage";
import { Batch } from "../../../storage/model/Batch";

/**
 * This interface allows the SettlementModule to retrieve information about
 * pending L2-dispatched (outgoing) messages that it can then use to roll
 * them up on the L1 contract.
 *
 * In the future, this interface should be flexibly typed so that the
 * outgoing message type is not limited to Withdrawals
 */
export interface OutgoingMessageAdapter<T> {
  extractEvents(block: Block): OutgoingMessageEvent<T>[];
}

@injectable()
export class OutgoingMessageCollector {
  public constructor(
    @inject("BlockStorage")
    private readonly blockStorage: BlockStorage,
    @inject("OutgoingMessageAdapter")
    private readonly messageAdapter: OutgoingMessageAdapter<any>
  ) {}

  public async extractEventsFromBatch(batch: Batch) {
    const blocks = await Promise.all(
      batch.blockHashes.map((hash) => this.blockStorage.getBlock(hash))
    );
    return blocks
      .filter(filterNonUndefined)
      .flatMap((block) => this.messageAdapter.extractEvents(block));
  }
}
