import { TaskPayload } from "../manager/ReducableTask";

/**
 * Definition of a connection-object that can generate queues and workers
 * for a specific connection type (e.g. BullMQ, In-memory)
 */
export interface TaskQueue {
  getQueue: (name: string) => Promise<InstantiatedQueue>;

  createWorker: (
    name: string,
    executor: (data: TaskPayload) => Promise<TaskPayload>
  ) => Closeable;
}

export interface Closeable {
  close: () => Promise<void>;
}

/**
 * Object that abstracts a concrete connection to a queue instance.
 */
export interface InstantiatedQueue extends Closeable {
  name: string;

  /**
   * Adds a specific payload to the queue and returns a unique jobId
   */
  addTask: (payload: TaskPayload) => Promise<{ taskId: string }>;

  /**
   * Registers a listener for the completion of jobs
   */
  onCompleted: (
    listener: (payload: TaskPayload) => Promise<void>
  ) => Promise<void>;
}

// export abstract class AbstractTaskQueue implements TaskQueue {
//   private queues: Record<string, InstantiatedQueue> = {}
//
//   public async getQueue(name: string): Promise<InstantiatedQueue> {
//     if(this.queues[name] === undefined){
//       return this.queues[name];
//     }else{
//
//     }
//   }
//
//   protected abstract createQueue: (name: string) => Promise<InstantiatedQueue>;
//
//   public abstract createWorker: (
//     name: string,
//     executor: (data: TaskPayload) => Promise<TaskPayload>
//   ) => Closeable;
// }