import type { EventEmitter } from "./EventEmitter";

export type EventSignature = unknown[];

export interface EventsRecord {
  [key: string]: EventSignature;
}

export interface EventEmittingComponent<Events extends EventsRecord> {
  events: EventEmitter<Events>;
}
