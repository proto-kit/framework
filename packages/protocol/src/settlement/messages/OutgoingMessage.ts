import { Field, Struct } from "o1js";

export class OutgoingMessageKeyStruct extends Struct({
  index: Field,
  tokenId: Field,
}) {}

export type OutgoingMessageEvent<T> = {
  key: OutgoingMessageKeyStruct;
  value: T;
  messageType: Field;
};

export type OutgoingMessage<T> = {
  value: T;
  messageType: Field;
};
