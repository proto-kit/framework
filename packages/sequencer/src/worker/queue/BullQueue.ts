// eslint-disable-next-line max-len
/* eslint-disable @typescript-eslint/no-non-null-assertion,@typescript-eslint/consistent-type-assertions */
import { MetricsTime, Queue, QueueEvents, Worker } from "bullmq";

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

  public createWorker(
    name: string,
    executor: (data: TaskPayload) => Promise<TaskPayload>,
    options?: { concurrency: number }
  ): Closeable {
    const worker = new Worker<TaskPayload, string>(
      name,
      async (job) => JSON.stringify(await executor(job.data)),
      {
        concurrency: options?.concurrency ?? 1,
        connection: this.redis,
        metrics: { maxDataPoints: MetricsTime.ONE_HOUR * 24 },
      }
    );

    // We have to do this, because we want to prevent the worker from crashing
    worker.on("error", (error) => {
      console.log("Worker threw error:");
      console.log(error);
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

      async addTask(payload: TaskPayload): Promise<{ jobId: string }> {
        const job = await queue.add(queueName, payload, {
          attempts: options.retryAttempts ?? 2,
        });
        return { jobId: job.id! };
      },

      async onCompleted(
        listener: (result: {
          jobId: string;
          payload: TaskPayload;
        }) => Promise<void>
      ) {
        events.on("completed", async (result) => {
          await listener({
            jobId: result.jobId,
            payload: JSON.parse(result.returnvalue) as TaskPayload,
          });
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
