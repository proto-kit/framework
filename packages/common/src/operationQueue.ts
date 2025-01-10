export type AsyncOperation<T> = () => Promise<T>;

export class OperationQueue {
  private queue: Promise<void>;

  constructor() {
    // Start with a resolved promise
    this.queue = Promise.resolve();
  }

  /**
   * Queue an operation to be executed
   * @param operation - The operation to queue
   * @returns A promise that resolves when the operation is completed
   */
  public queueOperation<T>(operation: AsyncOperation<T>): Promise<T> {
    // Chain the operation to the end of the queue and store the result
    // of the queued operation to return to the caller if he wants to wait
    // for it
    const result = this.queue.then(() => operation());

    // Update the queue and discard any errors
    this.queue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  /**
   * Wait for all operations to complete
   * @returns A promise that resolves when all operations are completed
   */
  public async onCompleted(): Promise<void> {
    await this.queue;
  }
}
