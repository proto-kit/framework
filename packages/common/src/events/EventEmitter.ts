import { EventsRecord } from "./EventEmittingComponent";

type ListenersHolder<Events extends EventsRecord> = {
  // eslint-disable-next-line putout/putout
  [key in keyof Events]?: ((...args: Events[key]) => void)[];
};

export class EventEmitter<Events extends EventsRecord> {
  private readonly listeners: ListenersHolder<Events> = {};

  public emit(event: keyof Events, ...parameters: Events[typeof event]) {
    const listeners = this.listeners[event];
    if(listeners !== undefined) {
      listeners.forEach((listener) => {
        listener(...parameters);
      });
    }
  }

  public on(
    event: keyof Events,
    listener: (...args: Events[typeof event]) => void
  ) {
    (this.listeners[event] ??= []).push(listener);
  }
}
