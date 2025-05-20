import { inject, injectable } from "tsyringe";
import { Withdrawal } from "@proto-kit/protocol";
import { Field, Struct } from "o1js";
import { log, ModuleContainer } from "@proto-kit/common";

import { Block } from "../../../storage/model/Block";
import { BridgingModule } from "../../BridgingModule";
import {
  startable,
  StartableModule,
} from "../../../sequencer/builder/StartableModule";

import { OutgoingMessageAdapter } from "./OutgoingMessageCollector";

// TODO Duplicate definition in Withdrawals.ts
export class WithdrawalKey extends Struct({
  index: Field,
  tokenId: Field,
}) {}

export class WithdrawalEvent extends Struct({
  key: WithdrawalKey,
  value: Withdrawal,
}) {}

@injectable()
@startable()
export class WithdrawalMessageAdapter
  implements OutgoingMessageAdapter<Withdrawal>, StartableModule
{
  public constructor(
    @inject("Sequencer") private sequencer: ModuleContainer<any>
  ) {}

  public async start(): Promise<void> {
    // Hacky workaround for this cyclic dependency
    // Ideal would be to make this module startable somehow
    const bridgingModule = this.sequencer.resolveOrFail(
      "BridgingModule",
      BridgingModule
    );

    const { withdrawalEventName } = bridgingModule.getBridgingModuleConfig();
    this.outgoingWithdrawalEvents = [withdrawalEventName];

    log.debug("Registered withdrawal events name", withdrawalEventName);
  }

  public outgoingWithdrawalEvents: string[] = [];

  public extractEvents(block: Block) {
    return block.transactions.flatMap((result) =>
      result.events
        .filter((event) =>
          this.outgoingWithdrawalEvents.includes(event.eventName)
        )
        .map((event) => WithdrawalEvent.fromFields(event.data))
    );
  }
}
