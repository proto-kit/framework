import type { EventEmitter } from "./EventEmitter";

export type EventsRecord = Record<string, unknown[]>;

export interface EventEmittingComponent<Events extends EventsRecord> {
  events: EventEmitter<Events>;
}
