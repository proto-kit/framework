import type { EventEmitter } from "./EventEmitter";

export type EventsRecord = Record<string, unknown[]>;

export interface EventEmittingComponent<Events extends EventsRecord> {
  events: EventEmitter<Events>;
}

export interface EventEmittingContainer<Events extends EventsRecord> {
  containerEvents: EventEmitter<Events>;
}
