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
  private queues: {
    [key: string]: { payload: TaskPayload; taskId: string }[];
  } = {};

  private busy = false;

  private workers: {
    [key: string]: {
      handler: (data: TaskPayload) => Promise<TaskPayload>;
    };
  } = {};

  private readonly listeners: {
    [key: string]: QueueListener[];
  } = {};

  private async workNextTasks() {
    log.debug("workNextTasks busy", this.busy);
    if (this.busy) return;
    this.busy = true;

    try {
      for (const queueName of Object.keys(this.queues)) {
        if (!this.workers[queueName]) return;

        const tasks = this.queues[queueName];

        for (const task of tasks) {
          const worker = this.workers[queueName];

          // clear the currently processed task from the queue
          this.queues[queueName] = this.queues[queueName].filter(
            (pendingTask) => pendingTask.taskId !== task.taskId
          );

          log.debug("LocalTaskQueue processing", task.payload.name);
          console.time("handling");
          const result = await worker.handler(task.payload);
          console.timeEnd("handling");
          log.debug("LocalTaskQueue got", JSON.stringify(result));

          for (const listener of this.listeners[queueName]) {
            await listener(result);
          }
        }
      }
    } catch (error) {
      log.error("LocalTaskQueue error:", error);
    } finally {
      this.busy = false;
    }

    const outstandingTasks = Object.values(this.queues).reduce(
      (taskCount, tasks) => taskCount.concat(tasks),
      []
    ).length;

    log.debug("outstandingTasks", outstandingTasks);

    if (outstandingTasks > 0) {
      this.workNextTasks();
    }
  }

  public async createWorker(
    queueName: string,
    executor: (data: TaskPayload) => Promise<TaskPayload>
  ): Promise<Closeable> {
    this.workers[queueName] = {
      handler: async (data: TaskPayload) => {
        await sleep(this.config.simulatedDuration ?? 0);

        return await executor(data);
      },
    };
    await this.workNextTasks();
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
