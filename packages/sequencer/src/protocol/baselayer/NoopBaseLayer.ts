import { noop } from "@proto-kit/common";
import { PublicKey } from "o1js";
import { OutgoingMessageEvent } from "@proto-kit/protocol";

import {
  SequencerModule,
  sequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { IncomingMessageAdapter } from "../../settlement/messages/IncomingMessageAdapter";
import { PendingTransaction } from "../../mempool/PendingTransaction";
import { OutgoingMessageAdapter } from "../../settlement/messages/outgoing/OutgoingMessageCollector";
import { Block } from "../../storage/model/Block";

import { StaticBaseLayer, StaticBaseLayerDependencyRecord } from "./BaseLayer";

class NoopIncomingMessageAdapter implements IncomingMessageAdapter {
  async fetchPendingMessages(
    address: PublicKey,
    params: {
      fromActionHash: string;
      toActionHash?: string;
    }
  ): Promise<{
    from: string;
    to: string;
    messages: PendingTransaction[];
  }> {
    return {
      from: "0",
      to: "0",
      messages: [],
    };
  }
}

class NoopMessageAdapter implements OutgoingMessageAdapter<undefined> {
  public extractEvents(block: Block): OutgoingMessageEvent<any>[] {
    return [];
  }
}

@sequencerModule()
export class NoopBaseLayer extends SequencerModule {
  public async blockProduced(): Promise<void> {
    noop();
  }

  public async start(): Promise<void> {
    noop();
  }

  public static dependencies(): StaticBaseLayerDependencyRecord {
    return {
      OutgoingMessageAdapter: {
        useClass: NoopMessageAdapter,
      },
      IncomingMessageAdapter: {
        useClass: NoopIncomingMessageAdapter,
      },
    };
  }
}

NoopBaseLayer satisfies StaticBaseLayer;
