import {
  Closeable,
  InstantiatedQueue,
  TaskQueue,
} from "../../src/worker/queue/TaskQueue";
import { TaskPayload } from "../../src/worker/manager/ReducableTask";

export class LocalTaskQueue implements TaskQueue {
  private queues: {
    [key: string]: { payload: TaskPayload; jobId: string }[];
  } = {};

  private workers: {
    [key: string]: {
      busy: boolean;
      handler: (data: TaskPayload) => Promise<TaskPayload>;
    };
  } = {};

  private readonly listeners: {
    [key: string]: ((result: {
      jobId: string;
      payload: TaskPayload;
    }) => Promise<void>)[];
  } = {};

  public constructor(private readonly simulatedDuration: number) {}

  private workNextTasks() {
    Object.entries(this.queues).forEach((queue) => {
      const tasks = queue[1];

      if (tasks.length > 0) {
        tasks.forEach((task) => {
          // Execute task in worker
          this.workers[queue[0]].handler(task.payload).then((result) => {
            // Notify listeners about result
            this.listeners[queue[0]].forEach(async (listener) => {
              await listener({ payload: result, jobId: task.jobId });
            });
          });
        });
      }

      this.queues[queue[0]] = [];
    });
  }

  public async getQueue(queueName: string): Promise<InstantiatedQueue> {
    this.queues[queueName] = [];

    let id = 0;

    const thisClojure = this;

    return {
      name: queueName,

      async addTask(payload: TaskPayload): Promise<{ jobId: string }> {
        id += 1;
        const nextId = String(id).toString();
        thisClojure.queues[queueName].push({ payload, jobId: nextId });

        thisClojure.workNextTasks();

        return { jobId: nextId };
      },

      async onCompleted(
        listener: (result: {
          jobId: string;
          payload: TaskPayload;
        }) => Promise<void>
      ): Promise<void> {
        (thisClojure.listeners[queueName] ??= []).push(listener);
      },

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      async close(): Promise<void> {},
    };
  }

  public createWorker(
    queueName: string,
    executor: (data: TaskPayload) => Promise<TaskPayload>
  ): Closeable {
    this.workers[queueName] = {
      busy: false,

      handler: async (data: TaskPayload) => {
        await sleep(this.simulatedDuration);

        return await executor(data);
      },
    };
    this.workNextTasks();
    return {
      close: async () => {},
    };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
