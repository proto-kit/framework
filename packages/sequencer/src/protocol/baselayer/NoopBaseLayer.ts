import { noop } from "@proto-kit/common";
import { PublicKey } from "o1js";
import { Withdrawal } from "@proto-kit/protocol";

import {
  SequencerModule,
  sequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { IncomingMessageAdapter } from "../../settlement/messages/IncomingMessageAdapter";
import { PendingTransaction } from "../../mempool/PendingTransaction";
import {
  OutgoingMessage,
  OutgoingMessageQueue,
} from "../../settlement/messages/WithdrawalQueue";

import { BaseLayer, BaseLayerDependencyRecord } from "./BaseLayer";

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

class NoopOutgoingMessageQueue implements OutgoingMessageQueue {
  length(): number {
    return 0;
  }

  peek(num: number): OutgoingMessage<Withdrawal>[] {
    return [];
  }

  pop(num: number): OutgoingMessage<Withdrawal>[] {
    return [];
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
      OutgoingMessageQueue: {
        useClass: NoopOutgoingMessageQueue,
      },
    };
  }
}
