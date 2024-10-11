import { EventsRecord } from "./EventEmittingComponent";
import { EventEmitter } from "./EventEmitter";

/**
 * Event Emitter variant that emits a certain event only once to a registered listener.
 * Additionally, if a listener registers to a event that has already been emitted, it
 * re-emits it to said listener.
 * This pattern is especially useful for listening for inclusions of transactions.
 * Those events will only occur once, and listeners could come too late to the party,
 * so we need to make sure they get notified as well in those cases.
 */
export class ReplayingSingleUseEventEmitter<
  Events extends EventsRecord,
> extends EventEmitter<Events> {
  public emitted: Partial<Events> = {};

  public emit<Key extends keyof Events>(
    event: Key,
    ...parameters: Events[Key]
  ) {
    super.emit(event, ...parameters);
    this.emitted[event] = parameters;
    this.listeners[event] = [];
  }

  public onAll(listener: (event: keyof Events, args: unknown[]) => void) {
    Object.entries(this.emitted).forEach(([key, params]) => {
      if (params !== undefined) listener(key, params);
    });
    super.onAll(listener);
  }

  public on<Key extends keyof Events>(
    event: Key,
    listener: (...args: Events[Key]) => void
  ) {
    if (this.emitted[event] !== undefined) {
      listener(...this.emitted[event]!);
    }
    super.on(event, listener);
  }
}
