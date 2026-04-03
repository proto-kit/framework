import { log, mapSequential, noop, sleep } from "@proto-kit/common";

import { sequencerModule } from "../../sequencer/builder/SequencerModule";
import { TaskPayload } from "../flow/Task";
import { Closeable } from "../../sequencer/builder/Closeable";

import { InstantiatedQueue, TaskQueue } from "./TaskQueue";
import { ListenerList } from "./ListenerList";
import { AbstractTaskQueue } from "./AbstractTaskQueue";

// Had to extract it to here bc eslint would ruin the code
interface QueueListener {
  (payload: TaskPayload): Promise<void>;
}

export interface LocalTaskQueueConfig {
  simulatedDuration?: number;
  retryAttempts?: number;
}

class InMemoryInstantiatedQueue implements InstantiatedQueue {
  public constructor(
    public readonly name: string,
    public taskQueue: LocalTaskQueue,
    private readonly retries: number
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
    this.taskQueue.queuedTasks[this.name].push({
      payload,
      taskId: nextId,
      retries: this.retries,
    });

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

  async drain() {
    this.taskQueue.queuedTasks[this.name] = [];
  }
}

@sequencerModule()
export class LocalTaskQueue
  extends AbstractTaskQueue<LocalTaskQueueConfig>
  implements TaskQueue
{
  public queuedTasks: {
    [key: string]: { payload: TaskPayload; taskId: string; retries: number }[];
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

            log.trace(`Working ${task.payload.name} with id ${task.taskId}`);

            let payloadLet: TaskPayload | "closed" | undefined;
            try {
              payloadLet = await this.workers[queueName]?.handler(task.payload);
            } catch (error) {
              if (task.retries >= 1) {
                log.info(
                  `Task ${task.taskId} ${task.payload.name} failed, retrying`
                );

                // TODO Not sound yet, iterator iterates over old entries without
                //  this new task
                this.queuedTasks[queueName].push({
                  payload: task.payload,
                  taskId: task.taskId,
                  retries: task.retries - 1,
                });

                return;
              } else {
                throw error;
              }
            }

            // Make it const so ts can infer narrowing types
            const payload = payloadLet;

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
            await Promise.all(listenerPromises || []);
          });
          this.queuedTasks[queueName] = [];
          return functions;
        } else if (tasks.length > 0) {
          log.warn(
            `Tasks found in queue ${queueName} but no worker registered`
          );
        }

        return [];
      }
    );

    // Execute all tasks
    await mapSequential(tasksToExecute, async (task) => await task());

    this.taskInProgress = false;

    // In case new tasks came up in the meantime, execute them as well
    if (this.hasTasksQueued()) {
      await this.workNextTasks();
    }
  }

  private hasTasksQueued() {
    return Object.entries(this.queuedTasks).some(
      ([, tasks]) => tasks.length > 0
    );
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
      return new InMemoryInstantiatedQueue(
        name,
        this,
        this.config.retryAttempts ?? 2
      );
    });
  }

  public async start(): Promise<void> {
    noop();
  }
}
