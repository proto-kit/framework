import { log, noop } from "@proto-kit/common";

import { SequencerModule } from "../../sequencer/builder/SequencerModule";
import { TaskPayload } from "../flow/Task";

import { Closeable, InstantiatedQueue, TaskQueue } from "./TaskQueue";

async function sleep(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

  private workNextTasks() {
    Object.entries(this.queues).forEach((queue) => {
      const [queueName, tasks] = queue;

      if (tasks.length > 0) {
        tasks.forEach((task) => {
          // Execute task in worker

          void this.workers[queueName].handler(task.payload).then((payload) => {
            log.trace("LocalTaskQueue got", JSON.stringify(payload));
            // Notify listeners about result
            const listenerPromises = this.listeners[queueName].map(
              async (listener) => {
                await listener(payload);
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
        await sleep(this.config.simulatedDuration ?? 0);

        return await executor(data);
      },
    };
    this.workNextTasks();
    return {
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

      addTask: async (payload: TaskPayload): Promise<{ taskId: string }> => {
        id += 1;
        const nextId = String(id).toString();
        this.queues[queueName].push({ payload, taskId: nextId });

        this.workNextTasks();

        return { taskId: nextId };
      },

      onCompleted: async (
        listener: (payload: TaskPayload) => Promise<void>
      ): Promise<void> => {
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
