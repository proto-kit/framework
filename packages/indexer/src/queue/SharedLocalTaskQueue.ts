import {
  Closeable,
  LocalTaskQueue,
  TaskPayload,
  TaskQueue,
} from "@proto-kit/sequencer";
import { injectable } from "tsyringe";

@injectable()
export class SharedLocalTaskQueue extends LocalTaskQueue implements TaskQueue {
  public sharedQueue?: LocalTaskQueue;

  public shareQueueWith(queue: LocalTaskQueue): void {
    console.log("setting shared queue", queue);
    this.sharedQueue = queue;
  }

  public createWorker(
    queueName: string,
    executor: (data: TaskPayload) => Promise<TaskPayload>
  ): Closeable {
    if (!this.sharedQueue) {
      throw new Error("SharedLocalTaskQueue has no shared queue");
    }
    return this.sharedQueue.createWorker(queueName, executor);
  }
}
