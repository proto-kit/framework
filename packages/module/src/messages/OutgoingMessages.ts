import {
  Field,
  FlexibleProvablePure,
  InferProvable,
  Poseidon,
  Struct,
  TokenId,
} from "o1js";
import {
  OutgoingMessageEvent,
  OutgoingMessageKeyStruct,
  PROTOKIT_FIELD_PREFIXES,
  RuntimeMethodExecutionContext,
  state as stateDecorator,
  StateMap,
  WithPath,
  WithStateServiceProvider,
} from "@proto-kit/protocol";
// eslint-disable-next-line import/no-extraneous-dependencies
import { Mixin } from "ts-mixer";
import { prefixToField, StringKeyOf } from "@proto-kit/common";
import { container } from "tsyringe";

export type OutgoingMessagesRecord = Record<string, FlexibleProvablePure<any>>;

export const outgoingMessage = stateDecorator;

export class OutgoingMessages<
  Messages extends OutgoingMessagesRecord,
> extends Mixin(WithPath, WithStateServiceProvider) {
  public readonly eventTypes: Record<
    string,
    {
      messageType: FlexibleProvablePure<{ messageType: Field; value: any }>;
      eventType: FlexibleProvablePure<{
        key: OutgoingMessageKeyStruct;
        value: any;
        messageType: Field;
      }>;
    }
  >;

  public constructor(private readonly messages: Messages) {
    super();
    this.eventTypes = this.computeEventTypes();
  }

  private counterState() {
    const state = new StateMap(Field, Field);
    state.path = PROTOKIT_FIELD_PREFIXES.OUTGOING_MESSAGE_COUNTER_PATH;
    state.stateServiceProvider = this.stateServiceProvider;
    return state;
  }

  public static getEventName(key: string) {
    return `outgoing-${key}`;
  }

  public computeEventTypes() {
    return Object.fromEntries(
      Object.entries(this.messages).map(([key, type]) => {
        class OutgoingMessageEventStruct extends Struct({
          key: OutgoingMessageKeyStruct,
          value: type,
          messageType: Field,
        }) {}

        class OutgoingMessageStruct extends Struct({
          value: type,
          messageType: Field,
        }) {}

        return [
          OutgoingMessages.getEventName(key),
          {
            messageType: OutgoingMessageStruct,
            eventType: OutgoingMessageEventStruct,
          },
        ];
      })
    );
  }

  private emitEvent<Key extends StringKeyOf<Messages>>(
    eventName: string,
    value: OutgoingMessageEvent<InferProvable<Messages[Key]>>
  ) {
    const outgoingMessageType = this.eventTypes[eventName].eventType;

    return container
      .resolve(RuntimeMethodExecutionContext)
      .addEvent<
        OutgoingMessageEvent<InferProvable<Messages[Key]>>
      >(outgoingMessageType, value, eventName);
  }

  public async emitMessage<Key extends StringKeyOf<Messages>>(
    key: Key,
    value: InferProvable<Messages[Key]>,
    tokenId: Field = TokenId.default
  ) {
    const eventName = OutgoingMessages.getEventName(key);

    const stateMap = new StateMap(
      OutgoingMessageKeyStruct,
      this.eventTypes[eventName].messageType
    );
    stateMap.path = PROTOKIT_FIELD_PREFIXES.OUTGOING_MESSAGE_BASE_PATH;
    stateMap.stateServiceProvider = this.stateServiceProvider;

    const counterState = this.counterState();
    const counterOption = await counterState.get(tokenId);
    const counter = counterOption.orElse(Field(0));

    const messageKey = { index: counter, tokenId };
    // TODO Salt/prefix
    const messageType = Poseidon.hash([prefixToField(key)]);

    await counterState.set(tokenId, counter.add(1));
    await stateMap.set(messageKey, { messageType, value });

    this.emitEvent(eventName, { key: messageKey, value, messageType });
  }
}
