import { noop } from "@proto-kit/common";

import {
  SequencerModule,
  sequencerModule,
} from "../../sequencer/builder/SequencerModule";

import { BaseLayer, BaseLayerDependencyRecord } from "./BaseLayer";
import { IncomingMessageAdapter } from "../../settlement/messages/IncomingMessageAdapter";
import { PendingTransaction } from "../../mempool/PendingTransaction";
import { PublicKey } from "o1js";

class NoopIncomingMessageAdapter implements IncomingMessageAdapter {
  async getPendingMessages(
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

@sequencerModule()
export class NoopBaseLayer extends SequencerModule implements BaseLayer {
  public async blockProduced(): Promise<void> {
    noop();
  }

  public async start(): Promise<void> {
    noop();
  }

  public dependencies(): BaseLayerDependencyRecord {
    return {
      IncomingMessageAdapter: {
        useClass: NoopIncomingMessageAdapter,
      },
    };
  }
}
