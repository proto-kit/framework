import { inject, injectable } from "tsyringe";
import {
  MethodIdResolver,
  Runtime,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import { Path, Withdrawal } from "@proto-kit/protocol";
import { Field } from "o1js";

import type { BlockTriggerBase } from "../../protocol/production/trigger/BlockTrigger";
import { SettlementModule } from "../SettlementModule";
import { SequencerModule } from "../../sequencer/builder/SequencerModule";
import { Sequencer } from "../../sequencer/executor/Sequencer";
import { UnprovenBlock } from "../../storage/model/UnprovenBlock";

export interface OutgoingMessage<Type> {
  index: number;
  value: Type;
}

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
  private lockedQueue: UnprovenBlock[] = [];

  private unlockedQueue: OutgoingMessage<Withdrawal>[] = [];

  private outgoingWithdrawalIds: bigint[] = [];

  private currentIndex = 0;

  public constructor(
    @inject("Runtime")
    private readonly runtime: Runtime<RuntimeModulesRecord>,
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

    const resolver =
      this.runtime.dependencyContainer.resolve<MethodIdResolver>(
        "MethodIdResolver"
      );

    const [withdrawalModule, withdrawalMethod] = settlementModule
      .getSettlementModuleConfig()
      .withdrawalMethodPath.split(".");

    const methodId = resolver.getMethodId(withdrawalModule, withdrawalMethod);
    this.outgoingWithdrawalIds = [methodId];

    // TODO Very primitive and error-prone, wait for runtime events
    // TODO Replace by stateservice call?
    if (settlementModule.addresses !== undefined) {
      const { settlement } = settlementModule.getContracts();
      this.currentIndex = Number(
        settlement.outgoingMessageCursor.get().toBigInt()
      );
    }

    this.sequencer.events.on("block-produced", (block) => {
      this.lockedQueue.push(block);
    });

    settlementModule.events.on("settlement-submitted", (batch) => {
      // TODO After persistance PR, link the blocks with the batch based on the ids
      // TODO After runtime events, use those

      const withdrawals = this.lockedQueue.flatMap((block) => {
        const [withdrawalModule2, withdrawalStatePath] = settlementModule
          .getSettlementModuleConfig()
          .withdrawalStatePath.split(".");
        const path = Path.fromProperty(withdrawalModule2, withdrawalStatePath);

        return block.transactions
          .filter(
            (tx) =>
              this.outgoingWithdrawalIds.includes(tx.tx.methodId.toBigInt()) &&
              tx.status.toBoolean()
          )
          .map<OutgoingMessage<Withdrawal>>((tx) => {
            const thisPath = Path.fromKey(
              path,
              Field,
              Field(this.currentIndex)
            );
            const fields = tx.stateTransitions
              .filter((value) => value.path.equals(thisPath).toBoolean())
              .at(-1)?.toValue.value;

            const withdrawal = Withdrawal.fromFields(fields!);
            return {
              // eslint-disable-next-line no-plusplus
              index: this.currentIndex++,
              value: withdrawal,
            };
          });
      });
      this.unlockedQueue.push(...withdrawals);
      this.lockedQueue = [];
    });
  }
}
