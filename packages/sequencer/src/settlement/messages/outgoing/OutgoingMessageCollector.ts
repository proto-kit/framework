import { inject, injectable } from "tsyringe";
import { Withdrawal } from "@proto-kit/protocol";
import { Field } from "o1js";
import { filterNonUndefined } from "@proto-kit/common";

import type { BlockTriggerBase } from "../../../protocol/production/trigger/BlockTrigger";
import type { SettlementModule } from "../../SettlementModule";
import { Sequencer } from "../../../sequencer/executor/Sequencer";
import { Block } from "../../../storage/model/Block";
import {
  BlockStorage,
  HistoricalBlockStorage,
} from "../../../storage/repositories/BlockStorage";
import { SettlementStorage } from "../../../storage/repositories/SettlementStorage";
import { HistoricalBatchStorage } from "../../../storage/repositories/BatchStorage";
import { Batch } from "../../../storage/model/Batch";

export interface OutgoingMessage<Type> {
  index: number;
  value: Type;
}

export type OutgoingMessageKey = {
  index: Field;
  tokenId: Field;
};

export type WithdrawalEvent<T> = {
  key: OutgoingMessageKey;
  value: T;
};

/**
 * This interface allows the SettlementModule to retrieve information about
 * pending L2-dispatched (outgoing) messages that it can then use to roll
 * them up on the L1 contract.
 *
 * In the future, this interface should be flexibly typed so that the
 * outgoing message type is not limited to Withdrawals
 */
export interface OutgoingMessageAdapter<T> {
  extractEvents(block: Block): WithdrawalEvent<T>[];
}

@injectable()
export class OutgoingMessageCollector {
  public constructor(
    @inject("Sequencer")
    private readonly sequencer: Sequencer<{
      BlockTrigger: typeof BlockTriggerBase;
      SettlementModule: typeof SettlementModule;
    }>,
    @inject("BlockStorage")
    private readonly blockStorage: BlockStorage & HistoricalBlockStorage,
    @inject("BatchStorage")
    private readonly batchStorage: HistoricalBatchStorage,
    @inject("SettlementStorage")
    private readonly settlementStorage: SettlementStorage,
    // TODO Enabled multiple adapters for multiple message types
    //  Also make it generic
    @inject("OutgoingMessageAdapter")
    private readonly messageAdapter: OutgoingMessageAdapter<Withdrawal>
  ) {}

  public async extractEventsFromBatch(batch: Batch) {
    const blocks = await Promise.all(
      batch.blockHashes.map((hash) => this.blockStorage.getBlock(hash))
    );
    return blocks
      .filter(filterNonUndefined)
      .flatMap((block) => this.messageAdapter.extractEvents(block));
  }

  // TODO Not really efficient right now in regards to DB trips, can be
  //  easily built as a join query though
  private async getLatestSettledBlock(): Promise<Block | undefined> {
    const settlement = await this.settlementStorage.getLatestSettlement();
    if (settlement !== undefined) {
      const lastBatch = settlement.batches.at(-1);
      if (lastBatch !== undefined) {
        const batch = await this.batchStorage.getBatchAt(lastBatch);
        if (batch !== undefined) {
          const blockHash = batch.blockHashes.at(-1);
          if (blockHash !== undefined) {
            return await this.blockStorage.getBlock(blockHash);
          }
        }
      }
    }
    return undefined;
  }

  private async findBlockWithEvent(tokenId: Field, index: number) {
    let block = await this.getLatestSettledBlock();

    // Casting to defined here is fine, bcs in all cases where that could be undefined,
    // we break and return undefined all together.
    const blockHistory = [block!];

    while (block !== undefined) {
      const events = this.messageAdapter.extractEvents(block);
      const found = events.find((withdrawalEvent) => {
        return withdrawalEvent.key.tokenId
          .equals(tokenId)
          .and(withdrawalEvent.key.index.equals(index))
          .toBoolean();
      });
      if (found !== undefined) {
        return blockHistory.reverse();
      }
      if (block.previousBlockHash !== undefined) {
        // eslint-disable-next-line no-await-in-loop
        block = await this.blockStorage.getBlock(
          block.previousBlockHash.toString()
        );
        blockHistory.push(block!);
      }
    }
    return undefined;
  }

  public async fetchWithdrawals(
    tokenId: Field,
    offset: number
  ): Promise<OutgoingMessage<Withdrawal>[]> {
    const blocks = await this.findBlockWithEvent(tokenId, offset);

    const events = blocks
      ?.flatMap((block) => this.messageAdapter.extractEvents(block))
      ?.map((event) => ({
        index: parseInt(event.key.index.toString(), 10),
        value: event.value,
      }));
    return events ?? [];
  }
}
