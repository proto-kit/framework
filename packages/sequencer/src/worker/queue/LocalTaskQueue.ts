import { noop } from "@yab/protocol";

import { TaskPayload } from "../manager/ReducableTask";

import { Closeable, InstantiatedQueue, TaskQueue } from "./TaskQueue";

async function sleep(ms: number) {
  // eslint-disable-next-line promise/avoid-new,no-promise-executor-return
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// Had to extract it to here bc eslint would ruin the code
interface QueueListener {
  (result: { taskId: string; payload: TaskPayload }): Promise<void>;
}

export class LocalTaskQueue implements TaskQueue {
  private queues: {
    [key: string]: { payload: TaskPayload; taskId: string }[];
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
            console.log("Got", JSON.stringify(payload));
            // Notify listeners about result
            const listenerPromises = this.listeners[queueName].map(
              async (listener) => {
                console.log("Got 1 listener");
                await listener({ payload, taskId: task.taskId });
              }
            );
            void Promise.all(listenerPromises);
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

    return {
      name: queueName,

      // eslint-disable-next-line putout/putout
      addTask: async (payload: TaskPayload): Promise<{ taskId: string }> => {
        id += 1;
        const nextId = String(id).toString();
        this.queues[queueName].push({ payload, taskId: nextId });

        this.workNextTasks();

        return { taskId: nextId };
      },

      // eslint-disable-next-line putout/putout
      onCompleted: async (
        listener: (result: {
          taskId: string;
          payload: TaskPayload;
        }) => Promise<void>
      ): Promise<void> => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        (this.listeners[queueName] ??= []).push(listener);
      },

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      async close(): Promise<void> {},
    };
  }

  public createWorker(queueName: string, executor: (data: TaskPayload) => Promise<TaskPayload>): Closeable {
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
