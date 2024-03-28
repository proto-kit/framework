import { log, noop } from "@proto-kit/common";

import { TaskPayload } from "../manager/ReducableTask";

import { Closeable, InstantiatedQueue, TaskQueue } from "./TaskQueue";
import { SequencerModule } from "../../sequencer/builder/SequencerModule";

async function sleep(ms: number) {
  // eslint-disable-next-line promise/avoid-new,no-promise-executor-return
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// Had to extract it to here bc eslint would ruin the code
interface QueueListener {
  (payload: TaskPayload): Promise<void>;
}

export interface LocalTaskQueueConfig {
  simulatedDuration?: number;
}

export class LocalTaskQueue
  extends SequencerModule<LocalTaskQueueConfig>
  implements TaskQueue
{
  public queues: {
    [key: string]: { payload: TaskPayload; taskId: string }[];
  } = {};

  public workers: {
    [key: string]:
      | {
          busy: boolean;
          handler: (data: TaskPayload) => Promise<TaskPayload>;
        }
      | undefined;
  } = {};

  public readonly listeners: {
    [key: string]: QueueListener[] | undefined;
  } = {};

  public workNextTasks() {
    Object.entries(this.queues).forEach(([queueName, tasks]) => {
      if (tasks.length > 0 && this.workers[queueName]) {
        tasks.forEach((task) => {
          // Execute task in worker
          // eslint-disable-next-line max-len
          // eslint-disable-next-line promise/prefer-await-to-then,promise/always-return
          void this.workers[queueName]
            ?.handler(task.payload)
            .then((payload) => {
              log.trace("LocalTaskQueue got", JSON.stringify(payload));
              // Notify listeners about result
              const listenerPromises = this.listeners[queueName]?.map(
                async (listener) => {
                  await listener(payload);
                }
              );
              void Promise.all(listenerPromises || []);
            });
        });
      }

      this.queues[queueName] = [];
    });
  }

  public createWorker(
    queueName: string,
    executor: (data: TaskPayload) => Promise<TaskPayload>
  ): Closeable {
    this.workers[queueName] = {
      busy: false,

      handler: async (data: TaskPayload) => {
        await sleep(this.config.simulatedDuration ?? 0);

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
        listener: (payload: TaskPayload) => Promise<void>
      ): Promise<void> => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        (this.listeners[queueName] ??= []).push(listener);
      },

      close: async () => {
        noop();
      },
    };
  }

  public async start(): Promise<void> {
    noop();
  }
}
