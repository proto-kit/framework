import { inject, injectable } from "tsyringe";
import { Withdrawal } from "@proto-kit/protocol";
import { Field, Struct } from "o1js";
import { splitArray } from "@proto-kit/common";

import type { BlockTriggerBase } from "../../protocol/production/trigger/BlockTrigger";
import { SettlementModule } from "../SettlementModule";
import { SequencerModule } from "../../sequencer/builder/SequencerModule";
import { Sequencer } from "../../sequencer/executor/Sequencer";
import { Block } from "../../storage/model/Block";
import { BridgingModule } from "../BridgingModule";

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
export interface OutgoingMessageQueue {
  peek: (num: number) => OutgoingMessage<Withdrawal>[];
  pop: (num: number) => OutgoingMessage<Withdrawal>[];
  length: () => number;
}

@injectable()
export class WithdrawalQueue
  extends SequencerModule
  implements OutgoingMessageQueue
{
  private lockedQueue: Block[] = [];

  private unlockedQueue: OutgoingMessage<Withdrawal>[] = [];

  private outgoingWithdrawalEvents: string[] = [];

  public constructor(
    @inject("Sequencer")
    private readonly sequencer: Sequencer<{
      BlockTrigger: typeof BlockTriggerBase;
      SettlementModule: typeof SettlementModule;
    }>
  ) {
    super();
  }

  public peek(num: number): OutgoingMessage<Withdrawal>[] {
    return this.unlockedQueue.slice(0, num);
  }

  public pop(num: number): OutgoingMessage<Withdrawal>[] {
    const slice = this.peek(num);
    this.unlockedQueue = this.unlockedQueue.slice(num);
    return slice;
  }

  public length() {
    return this.unlockedQueue.length;
  }

  public async start(): Promise<void> {
    // Hacky workaround for this cyclic dependency
    const settlementModule = this.sequencer.resolveOrFail(
      "SettlementModule",
      SettlementModule
    );
    const bridgingModule = this.sequencer.resolveOrFail(
      "BridgingModule",
      BridgingModule
    );

    const { withdrawalEventName } = bridgingModule.getBridgingModuleConfig();
    this.outgoingWithdrawalEvents = [withdrawalEventName];

    this.sequencer.events.on("block-produced", (block) => {
      this.lockedQueue.push(block);
    });

    // TODO Add event settlement-included and register it there
    settlementModule.events.on("settlement-submitted", (batch) => {
      // This finds out which blocks are contained in this batch and extracts only from those
      const { inBatch, notInBatch } = splitArray(this.lockedQueue, (block) =>
        batch.blockHashes.includes(block.hash.toString())
          ? "inBatch"
          : "notInBatch"
      );

      const withdrawals = (inBatch ?? []).flatMap((block) => {
        return block.transactions
          .flatMap((tx) =>
            tx.events
              .filter(
                (event) => event.eventName === this.outgoingWithdrawalEvents[0]
              )
              .map((event) => {
                return {
                  tx,
                  event,
                };
              })
          )
          .map<OutgoingMessage<Withdrawal>>(({ tx, event }) => {
            const withdrawalEvent = WithdrawalEvent.fromFields(event.data);

            return {
              index: Number(withdrawalEvent.key.index.toString()),
              value: withdrawalEvent.value,
            };
          });
      });
      this.unlockedQueue.push(...withdrawals);
      this.lockedQueue = notInBatch ?? [];
    });
  }
}
