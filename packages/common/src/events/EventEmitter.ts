import { EventsRecord } from "./EventEmittingComponent";

type ListenersHolder<Events extends EventsRecord> = {
  [key in keyof Events]?: {
    id: number;
    listener: (...args: Events[key]) => void;
  }[];
};

export class EventEmitter<Events extends EventsRecord> {
  private readonly listeners: ListenersHolder<Events> = {};

  private counter = 0;

  // Fields used for offSelf()
  private currentListenerId: number | undefined = undefined;

  private currentListenerEventName: keyof Events | undefined = undefined;

  public emit(event: keyof Events, ...parameters: Events[typeof event]) {
    const listeners = this.listeners[event];
    if (listeners !== undefined) {
      this.currentListenerEventName = event;

      listeners.forEach((listener) => {
        this.currentListenerId = listener.id;

        listener.listener(...parameters);

        this.currentListenerId = undefined;
      });
      this.currentListenerEventName = undefined;
    }
  }

  public on<Key extends keyof Events>(
    event: Key,
    listener: (...args: Events[Key]) => void
  ): number {
    // eslint-disable-next-line no-multi-assign
    const id = (this.counter += 1);
    (this.listeners[event] ??= []).push({
      id,
      listener,
    });
    return id;
  }

  // eslint-disable-next-line no-warning-comments
  // TODO Improve to be thread-safe
  public offSelf() {
    if (
      this.currentListenerEventName !== undefined &&
      this.currentListenerId !== undefined
    ) {
      this.off(this.currentListenerEventName, this.currentListenerId);
    }
  }

  public off<Key extends keyof Events>(event: Key, id: number) {
    const listeners = this.listeners[event];
    if (listeners !== undefined) {
      this.listeners[event] = listeners.filter(
        (listener) => listener.id !== id
      );
    }
  }
}
