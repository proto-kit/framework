import {
  AccountUpdate,
  Bool,
  Field,
  FlexibleProvablePure,
  Poseidon,
  PublicKey,
} from "o1js";
import { implement, NoConfig, prefixToField } from "@proto-kit/common";

import { ProtocolModule } from "../../protocol/ProtocolModule";

export function outgoingMessageProcessor() {
  return implement("OutgoingMessageProcessor");
}

export type MessageProcessorArgs = {
  bridgeContract: {
    publicKey: PublicKey;
    tokenId: Field;
  };
};

export abstract class OutgoingMessageProcessor<
  T,
  Config = NoConfig,
> extends ProtocolModule<Config> {
  private status: Bool = Bool(false);

  private statusMessage?: string = undefined;

  public assertTrue(b: Bool, msg?: string) {
    this.status = this.status.and(b);
    if (this.statusMessage === undefined) {
      this.statusMessage = msg;
    }
  }

  processMessage(
    message: T,
    args: MessageProcessorArgs
  ): {
    accountUpdates: AccountUpdate[];
    status: Bool;
    statusMessage?: string;
  } {
    this.status = Bool(true);
    this.statusMessage = undefined;

    const accountUpdates = this.process(message, args);

    return {
      accountUpdates,
      status: this.status,
      statusMessage: this.statusMessage,
    };
  }

  public getMessageType(): Field {
    // TODO static salt/prefix
    // This executes the bigint poseidon behind the scenes, therefore creates a constant
    const messageType = Poseidon.hash([prefixToField(this.messageType)]);
    if (!messageType.isConstant()) {
      throw new Error(
        "Underlying poseidon implementation has changed and doesn't create a constant anymore"
      );
    }
    return messageType;
  }

  abstract type: FlexibleProvablePure<T> & { name: string };

  abstract messageType: string;

  abstract dummy(): T;

  abstract process(message: T, args: MessageProcessorArgs): AccountUpdate[];
}
