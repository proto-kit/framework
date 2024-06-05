import { EventsRecord } from "./EventEmittingComponent";

type ListenersHolder<Events extends EventsRecord> = {
  [key in keyof Events]?: ((...args: Events[key]) => void)[];
};

export class EventEmitter<Events extends EventsRecord> {
  private readonly listeners: ListenersHolder<Events> = {};

  private readonly wildcardListeners: ((
    event: keyof Events,
    args: Events[keyof Events]
  ) => void)[] = [];

  public emit<Key extends keyof Events>(
    event: Key,
    ...parameters: Events[Key]
  ) {
    const listeners = this.listeners[event];
    if (listeners !== undefined) {
      listeners.forEach((listener) => {
        listener(...parameters);
      });
    }
    this.wildcardListeners.forEach((wildcardListener) => {
      wildcardListener(event, parameters);
    });
  }

  public onAll(listener: (event: keyof Events, args: unknown[]) => void): void {
    this.wildcardListeners.push(listener);
  }

  public on<Key extends keyof Events>(
    event: Key,
    listener: (...args: Events[Key]) => void
  ) {
    (this.listeners[event] ??= []).push(listener);
  }

  /**
   * Primitive .off() with identity comparison for now.
   * Could be replaced by returning an id in .on() and using that.
   */
  public off<Key extends keyof Events>(
    event: Key,
    listener: (...args: Events[Key]) => void
  ) {
    const events = this.listeners[event];
    if (events !== undefined) {
      this.listeners[event] = events.filter(
        (candidate) => candidate !== listener
      );
    }
  }
}
