import { MetricsTime, Queue, QueueEvents, Worker } from "bullmq";
import { log, noop } from "@proto-kit/common";
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
  public createWorker(
    name: string,
    executor: (data: TaskPayload) => Promise<TaskPayload>,
    options?: { concurrency?: number }
  ): Closeable {
    const worker = new Worker<TaskPayload, TaskPayload>(
      name,
      async (job) => await executor(job.data),
      {
        concurrency: options?.concurrency ?? 1,
        connection: this.config.redis,

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

  public async getQueue(queueName: string): Promise<InstantiatedQueue> {
    const { retryAttempts, redis } = this.config;

    const queue = new Queue<TaskPayload, TaskPayload>(queueName, {
      connection: redis,
    });
    const events = new QueueEvents(queueName, { connection: redis });

    await queue.drain();

    return {
      name: queueName,

      async addTask(payload: TaskPayload): Promise<{ taskId: string }> {
        const job = await queue.add(queueName, payload, {
          attempts: retryAttempts ?? 2,
        });
        return { taskId: job.id! };
      },

      async onCompleted(listener: (payload: TaskPayload) => Promise<void>) {
        events.on("completed", async (result) => {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          await listener(JSON.parse(result.returnvalue) as TaskPayload);
        });
        await events.waitUntilReady();
      },

      async close(): Promise<void> {
        await events.close();
        await queue.close();
      },
    };
  }

  public async start() {
    noop();
  }
}
