export type AsyncOperation<T> = () => Promise<T>;

export class OperationQueue {
  private queue: Array<{
    operation: AsyncOperation<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];

  private running = false;

  private pendingCount = 0;

  private drainResolvers: Array<() => void> = [];

  // Enqueue an operation and return a promise for its result
  queueOperation<T>(operation: AsyncOperation<T>): Promise<T> {
    console.log("queuing operation, previous pendingCount:", this.pendingCount);
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        operation,
        resolve,
        reject,
      });
      this.pendingCount += 1;
      console.log("pendingCount:", this.pendingCount);
      // If not running, start processing the queue
      if (!this.running) {
        this.running = true;
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.runNext();
      }
    });
  }

  // Run the next operation in the queue
  private async runNext() {
    // If there are no operations left, mark as not running and possibly resolve drain
    if (this.queue.length === 0) {
      console.log("no more operations to resolve");
      this.running = false;
      // If everything is done, resolve any drain promises
      if (this.pendingCount === 0) {
        this.resolveDrain();
      }
      return;
    }

    const { operation, resolve, reject } = this.queue.shift()!;
    try {
      console.log("running operation");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await operation();
      console.log("operation succeeded");
      resolve(result);
    } catch (error) {
      console.log("operation failed");
      reject(error);
    } finally {
      console.log("operation resolved");
      this.pendingCount -= 1;
      console.log("pendingCount:", this.pendingCount);
      console.log("queue length:", this.queue.length);
      if (this.queue.length > 0) {
        console.log("running next operation");
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.runNext();
      } else {
        // No more tasks in the queue
        console.log("no more operations to resolve");
        this.running = false;
        if (this.pendingCount === 0) {
          console.log("no more pending operations");
          this.resolveDrain();
        }
      }
    }
  }

  // Returns a promise that resolves when all queued operations have completed
  onCompleted() {
    console.log("waiting for drain, pendingCount:", this.pendingCount);
    if (this.queue.length === 0 && this.pendingCount === 0) {
      console.log("no pending tasks, resolve immediately");
      // No pending tasks, resolve immediately
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.drainResolvers.push(resolve);
    });
  }

  private resolveDrain() {
    if (this.queue.length === 0 && this.pendingCount === 0) {
      while (this.drainResolvers.length > 0) {
        const resolver = this.drainResolvers.shift()!;
        resolver();
      }
    }
  }
}
