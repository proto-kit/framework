import { inject, injectable } from "tsyringe";
import { Withdrawal } from "@proto-kit/protocol";
import { Field, Struct } from "o1js";
import { ModuleContainerLike } from "@proto-kit/common";

import { SequencerModule } from "../../sequencer/builder/SequencerModule";
import { Block } from "../../storage/model/Block";
import { BridgingModule } from "../BridgingModule";
import {
  BlockStorage,
  HistoricalBlockStorage,
} from "../../storage/repositories/BlockStorage";
import { SettlementStorage } from "../../storage/repositories/SettlementStorage";
import { HistoricalBatchStorage } from "../../storage/repositories/BatchStorage";

export interface OutgoingMessage<Type> {
  index: number;
  value: Type;
}

// TODO Duplicate definition in Withdrawals.ts
export class WithdrawalKey extends Struct({
  index: Field,
  tokenId: Field,
}) {}

export class WithdrawalEvent extends Struct({
  key: WithdrawalKey,
  value: Withdrawal,
}) {}

/**
 * This interface allows the SettlementModule to retrieve information about
 * pending L2-dispatched (outgoing) messages that it can then use to roll
 * them up on the L1 contract.
 *
 * In the future, this interface should be flexibly typed so that the
 * outgoing message type is not limited to Withdrawals
 */
export interface OutgoingMessageAdapter {
  fetchWithdrawals(
    tokenId: Field,
    offset: number
  ): Promise<OutgoingMessage<Withdrawal>[]>;
}

@injectable()
export class WithdrawalQueue
  extends SequencerModule
  implements OutgoingMessageAdapter
{
  private outgoingWithdrawalEvents: string[] = [];

  public constructor(
    @inject("Sequencer")
    private readonly sequencer: ModuleContainerLike,
    @inject("BlockStorage")
    private readonly blockStorage: BlockStorage & HistoricalBlockStorage,
    @inject("BatchStorage")
    private readonly batchStorage: HistoricalBatchStorage,
    @inject("SettlementStorage")
    private readonly settlementStorage: SettlementStorage
  ) {
    super();
  }

  private extractEventsFromBlock(block: Block) {
    return block.transactions.flatMap((result) =>
      result.events
        .filter((event) =>
          this.outgoingWithdrawalEvents.includes(event.eventName)
        )
        .map((event) => WithdrawalEvent.fromFields(event.data))
    );
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
      const events = this.extractEventsFromBlock(block);
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
      ?.flatMap((block) => this.extractEventsFromBlock(block))
      ?.map((event) => ({
        index: parseInt(event.key.index.toString(), 10),
        value: event.value,
      }));
    return events ?? [];
  }

  public async start(): Promise<void> {
    // Hacky workaround for this cyclic dependency
    const bridgingModule = this.sequencer.resolveOrFail(
      "BridgingModule",
      BridgingModule
    );

    const { withdrawalEventName } = bridgingModule.getBridgingModuleConfig();
    this.outgoingWithdrawalEvents = [withdrawalEventName];
  }
}
