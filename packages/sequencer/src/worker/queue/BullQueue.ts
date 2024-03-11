// eslint-disable-next-line max-len
/* eslint-disable @typescript-eslint/no-non-null-assertion,@typescript-eslint/consistent-type-assertions */
import { MetricsTime, Queue, QueueEvents, Worker } from "bullmq";
import { log } from "@proto-kit/common";

import { TaskPayload } from "../manager/ReducableTask";

import { Closeable, InstantiatedQueue, TaskQueue } from "./TaskQueue";

/**
 * TaskQueue implementation for BullMQ
 */
export class BullQueue implements TaskQueue {
  public constructor(
    private readonly redis: {
      host: string;
      port: number;
      username?: string;
      password?: string;
    },
    private readonly options: {
      retryAttempts?: number;
    } = {}
  ) {}

  public async createWorker(
    name: string,
    executor: (data: TaskPayload) => Promise<TaskPayload>,
    options?: { concurrency: number }
  ): Promise<Closeable> {
    const worker = new Worker<TaskPayload, string>(
      name,
      async (job) => JSON.stringify(await executor(job.data)),
      {
        concurrency: options?.concurrency ?? 1,
        connection: this.redis,
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
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
    const queue = new Queue<TaskPayload, TaskPayload>(queueName, {
      connection: this.redis,
    });
    const events = new QueueEvents(queueName, { connection: this.redis });

    await queue.drain();

    const { options } = this;

    return {
      name: queueName,

      async addTask(payload: TaskPayload): Promise<{ taskId: string }> {
        const job = await queue.add(queueName, payload, {
          attempts: options.retryAttempts ?? 2,
        });
        return { taskId: job.id! };
      },

      async onCompleted(listener: (payload: TaskPayload) => Promise<void>) {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        events.on("completed", async (result) => {
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
}
