import { inject, injectable } from "tsyringe";
import { Field, FlexibleProvablePure } from "o1js";
import { filterNonUndefined, log } from "@proto-kit/common";
import { Runtime, RuntimeModule } from "@proto-kit/module";
import { OutgoingMessageKeyStruct } from "@proto-kit/protocol";

import { Block } from "../../../storage/model/Block";
import {
  startable,
  StartableModule,
} from "../../../sequencer/builder/StartableModule";

import { OutgoingMessageAdapter } from "./OutgoingMessageCollector";

@injectable()
@startable()
export class DefaultOutgoingMessageAdapter
  implements OutgoingMessageAdapter<any>, StartableModule
{
  public constructor(
    @inject("Runtime") private readonly runtime: Runtime<any>
  ) {}

  public async start(): Promise<void> {
    this.outgoingWithdrawalEvents = this.runtime.runtimeModuleNames
      .map((moduleName) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const module: RuntimeModule<unknown> = this.runtime.resolve(moduleName);
        return module.messages?.eventTypes;
      })
      .filter(filterNonUndefined)
      .reduce((a, b) => {
        Object.assign(a, b);
        return a;
      }, {});

    log.debug(
      "Registered withdrawal events name",
      Object.keys(this.outgoingWithdrawalEvents)
    );
  }

  public outgoingWithdrawalEvents: Record<
    string,
    {
      messageType: FlexibleProvablePure<{ messageType: Field; value: any }>;
      eventType: FlexibleProvablePure<{
        key: OutgoingMessageKeyStruct;
        value: any;
        messageType: Field;
      }>;
    }
  > = {};

  public extractEvents(block: Block) {
    return block.transactions.flatMap((result) =>
      result.events
        .filter(
          (event) =>
            this.outgoingWithdrawalEvents[event.eventName] !== undefined
        )
        .map((event) => {
          const type = this.outgoingWithdrawalEvents[event.eventName];
          return type.eventType.fromFields(event.data.map(d => Field(d)));
        })
    );
  }
}
