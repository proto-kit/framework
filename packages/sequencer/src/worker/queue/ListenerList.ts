import { mapSequential } from "@proto-kit/common";

export class ListenerList<T> {
  private listenerId: number = 0;

  private listeners: {
    listener: (payload: T) => Promise<void>;
    id: number;
  }[] = [];

  public getListeners() {
    return this.listeners.slice();
  }

  public async executeListeners(payload: T) {
    await mapSequential(
      this.getListeners(),
      async (listener) => await listener.listener(payload)
    );
  }

  public pushListener(listener: (payload: T) => Promise<void>) {
    // eslint-disable-next-line no-plusplus
    const id = this.listenerId++;

    this.listeners.push({
      listener,
      id,
    });

    return id;
  }

  public removeListener(listenerId: number) {
    this.listeners = this.listeners.filter(({ id }) => id !== listenerId);
  }
}
