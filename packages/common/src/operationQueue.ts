export type AsyncOperation<T> = () => Promise<T>;

export class OperationQueue {
  private queue: Promise<void>;

  constructor() {
    this.queue = Promise.resolve();
  }

  public queueOperation<T>(operation: AsyncOperation<T>): Promise<T> {
    const result = this.queue.then(() => operation());
    this.queue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  public async resolve(): Promise<void> {
    await this.queue;
  }
}
