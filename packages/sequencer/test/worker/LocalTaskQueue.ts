import { noop } from "@yab/protocol";

import {
  Closeable,
  InstantiatedQueue,
  TaskQueue,
} from "../../src/worker/queue/TaskQueue";
import { TaskPayload } from "../../src/worker/manager/ReducableTask";

async function sleep(ms: number) {
  // eslint-disable-next-line promise/avoid-new,no-promise-executor-return
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// Had to extract it to here bc eslint would ruin the code
interface QueueListener {
  (result: { jobId: string; payload: TaskPayload }): Promise<void>;
}

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
    [key: string]: QueueListener[];
  } = {};

  public constructor(private readonly simulatedDuration: number) {}

  private workNextTasks() {
    Object.entries(this.queues).forEach((queue) => {
      const [queueName, tasks] = queue;

      if (tasks.length > 0) {
        tasks.forEach((task) => {
          // Execute task in worker
          // eslint-disable-next-line max-len
          // eslint-disable-next-line promise/prefer-await-to-then,promise/always-return
          void this.workers[queueName].handler(task.payload).then((payload) => {
            // Notify listeners about result
            void this.listeners[queueName].map(async (listener) => {
              await listener({ payload, jobId: task.jobId });
            });
          });
        });
      }

      this.queues[queue[0]] = [];
    });
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
      // eslint-disable-next-line putout/putout
      close: async () => {
        noop();
      },
    };
  }

  public async getQueue(queueName: string): Promise<InstantiatedQueue> {
    this.queues[queueName] = [];

    let id = 0;

    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-this-alias,consistent-this,unicorn/no-this-assignment
    const thisClosure = this;

    return {
      name: queueName,

      async addTask(payload: TaskPayload): Promise<{ jobId: string }> {
        id += 1;
        const nextId = String(id).toString();
        thisClosure.queues[queueName].push({ payload, jobId: nextId });

        thisClosure.workNextTasks();

        return { jobId: nextId };
      },

      async onCompleted(
        listener: (result: {
          jobId: string;
          payload: TaskPayload;
        }) => Promise<void>
      ): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        (thisClosure.listeners[queueName] ??= []).push(listener);
      },

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      async close(): Promise<void> {},
    };
  }
}
