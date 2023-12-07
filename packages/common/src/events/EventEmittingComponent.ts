import type { EventEmitter } from "./EventEmitter";

export type EventPayload = unknown[];

export interface EventsRecord {
  [key: string]: EventPayload;
}

export interface EventEmittingComponent<Events extends EventsRecord> {
  events: EventEmitter<Events>;
}
