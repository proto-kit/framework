import { log, mapSequential, noop } from "@proto-kit/common";

import { sequencerModule } from "../../sequencer/builder/SequencerModule";
import { TaskPayload } from "../flow/Task";

import { Closeable, InstantiatedQueue, TaskQueue } from "./TaskQueue";
import { ListenerList } from "./ListenerList";
import { AbstractTaskQueue } from "./AbstractTaskQueue";

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

class InMemoryInstantiatedQueue implements InstantiatedQueue {
  public constructor(
    public readonly name: string,
    public taskQueue: LocalTaskQueue
  ) {}

  private id = 0;

  private instantiated = false;

  private listeners = new ListenerList<TaskPayload>();

  async addTask(
    payload: TaskPayload,
    taskId?: string
  ): Promise<{ taskId: string }> {
    this.id += 1;
    const nextId = taskId ?? String(this.id).toString();
    this.taskQueue.queuedTasks[this.name].push({ payload, taskId: nextId });

    void this.taskQueue.workNextTasks();

    return { taskId: nextId };
  }

  async onCompleted(
    listener: (payload: TaskPayload) => Promise<void>
  ): Promise<number> {
    if (!this.instantiated) {
      (this.taskQueue.listeners[this.name] ??= []).push(async (result) => {
        await this.listeners.executeListeners(result);
      });

      this.instantiated = false;
    }
    return this.listeners.pushListener(listener);
  }

  async offCompleted(listenerId: number) {
    this.listeners.removeListener(listenerId);
  }

  async close() {
    noop();
  }
}

@sequencerModule()
export class LocalTaskQueue
  extends AbstractTaskQueue<LocalTaskQueueConfig>
  implements TaskQueue
{
  public queuedTasks: {
    [key: string]: { payload: TaskPayload; taskId: string }[];
  } = {};

  private workers: {
    [key: string]:
      | {
          busy: boolean;
          handler: (data: TaskPayload) => Promise<TaskPayload | "closed">;
          close: () => Promise<void>;
        }
      | undefined;
  } = {};

  public readonly listeners: {
    [key: string]: QueueListener[] | undefined;
  } = {};

  private taskInProgress = false;

  public async workNextTasks() {
    if (this.taskInProgress) {
      return;
    }
    this.taskInProgress = true;

    // Collect all tasks
    const tasksToExecute = Object.entries(this.queuedTasks).flatMap(
      ([queueName, tasks]) => {
        if (tasks.length > 0 && this.workers[queueName]) {
          const functions = tasks.map((task) => async () => {
            // Execute task in worker

            const payload = await this.workers[queueName]?.handler(
              task.payload
            );

            if (payload === "closed" || payload === undefined) {
              return;
            }
            log.trace("LocalTaskQueue got", JSON.stringify(payload));
            // Notify listeners about result
            const listenerPromises = this.listeners[queueName]?.map(
              async (listener) => {
                await listener(payload);
              }
            );
            void Promise.all(listenerPromises || []);
          });
          this.queuedTasks[queueName] = [];
          return functions;
        }

        return [];
      }
    );

    // Execute all tasks
    await mapSequential(tasksToExecute, async (task) => await task());

    this.taskInProgress = false;

    // In case new tasks came up in the meantime, execute them as well
    if (tasksToExecute.length > 0) {
      await this.workNextTasks();
    }
  }

  public createWorker(
    queueName: string,
    executor: (data: TaskPayload) => Promise<TaskPayload>,
    options?: { concurrency?: number; singleUse?: boolean }
  ): Closeable {
    const close = async () => {
      this.workers[queueName] = {
        busy: false,

        handler: async () => {
          return "closed";
        },
        close: async () => {},
      };
    };

    const worker = {
      busy: false,

      handler: async (data: TaskPayload) => {
        await sleep(this.config.simulatedDuration ?? 0);

        const result = await executor(data);

        if (options?.singleUse ?? false) {
          await close();
        }

        return result;
      },

      close,
    };

    this.workers[queueName] = worker;
    void this.workNextTasks();

    return worker;
  }

  public async getQueue(queueName: string): Promise<InstantiatedQueue> {
    return this.createOrGetQueue(queueName, (name) => {
      this.queuedTasks[name] = [];
      return new InMemoryInstantiatedQueue(name, this);
    });
  }

  public async start(): Promise<void> {
    noop();
  }
}
