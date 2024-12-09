import { MetricsTime, Queue, QueueEvents, Worker } from "bullmq";
import { log, mapSequential, noop } from "@proto-kit/common";
import {
  TaskPayload,
  Closeable,
  InstantiatedQueue,
  TaskQueue,
  SequencerModule,
} from "@proto-kit/sequencer";

export interface BullQueueConfig {
  redis: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    db?: number;
  };
  retryAttempts?: number;
}

/**
 * TaskQueue implementation for BullMQ
 */
export class BullQueue
  extends SequencerModule<BullQueueConfig>
  implements TaskQueue
{
  private activePromise?: Promise<void>;

  public createWorker(
    name: string,
    executor: (data: TaskPayload) => Promise<TaskPayload>,
    options?: { concurrency?: number }
  ): Closeable {
    const worker = new Worker<TaskPayload, TaskPayload>(
      name,
      async (job) => {
        // This weird promise logic is needed to make sure the worker is not proving in parallel
        // This is by far not optimal - since it still picks up 1 task per queue but waits until
        // computing them, so that leads to bad performance over multiple workers.
        // For that we need to restructure tasks to be flowing through a single queue however
        while (this.activePromise !== undefined) {
          // eslint-disable-next-line no-await-in-loop
          await this.activePromise;
        }
        let resOutside: () => void = () => {};
        const promise = new Promise<void>((res) => {
          resOutside = res;
        });
        this.activePromise = promise;

        const result = await executor(job.data);
        this.activePromise = undefined;
        void resOutside();

        return result;
      },
      {
        concurrency: options?.concurrency ?? 1,
        connection: this.config.redis,
        stalledInterval: 60000, // 1 minute
        lockDuration: 60000, // 1 minute

        metrics: { maxDataPoints: MetricsTime.ONE_HOUR * 24 },
      }
    );

    // We have to do this, because we want to prevent the worker from crashing
    worker.on("error", (error) => {
      log.error("Worker threw error:");
      log.error(error);
    });

    return {
      async close() {
        await worker.close();
      },
    };
  }

  /**
   * 14 blocks:
   *
   * - 14 newBlocks
   * @param queueName
   */

  private initializedQueue: Record<string, InstantiatedQueue> = {};

  public async getQueue(queueName: string): Promise<InstantiatedQueue> {
    // queueName = "testqeue";

    if (this.initializedQueue[queueName] !== undefined) {
      return this.initializedQueue[queueName];
    }

    const { retryAttempts, redis } = this.config;

    const queue = new Queue<TaskPayload, TaskPayload>(queueName, {
      connection: redis,
    });
    const events = new QueueEvents(queueName, { connection: redis });

    const instantiatedQueue = {
      name: queueName,

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      listeners: [] as ((payload: TaskPayload) => Promise<void>)[],

      async addTask(payload: TaskPayload): Promise<{ taskId: string }> {
        log.debug("Adding task: ", payload);
        const job = await queue.add(queueName, payload, {
          attempts: retryAttempts ?? 2,
        });
        return { taskId: job.id! };
      },

      async onCompleted(listener: (payload: TaskPayload) => Promise<void>) {
        if (this.listeners.length === 0) {
          events.on("completed", async (result) => {
            log.debug("Completed task: ", result);
            try {
              await mapSequential(
                this.listeners,
                async (listener2) =>
                  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                  await listener2(result.returnvalue as unknown as TaskPayload)
              );
            } catch (e) {
              // Catch error explicitly since this promise is dangling,
              // therefore any error will be voided as well
              log.error(e);
            }
          });
          events.on("error", async (error) => {
            log.error("Error in worker", error);
          });
        }

        this.listeners.push(listener);
        await events.waitUntilReady();
      },

      async close(): Promise<void> {
        await events.close();
        await queue.drain();
        await queue.close();
      },
    };

    this.initializedQueue[queueName] = instantiatedQueue;

    await queue.drain();

    return instantiatedQueue;
  }

  public async start() {
    noop();
  }
}
