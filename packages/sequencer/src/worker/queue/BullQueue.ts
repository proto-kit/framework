import { Closeable, InstantiatedQueue, TaskQueue } from "./TaskQueue";
import { ReducableTask, TaskPayload } from "../manager/ReducableTask";
import { Metrics, MetricsTime, Queue, QueueEvents, Worker } from "bullmq";

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
      retryAttempts?: number
    } = {}
  ) {}

  public async getQueue(name: string): Promise<InstantiatedQueue> {
    const queue = new Queue<TaskPayload, TaskPayload>(name, { connection: this.redis });
    const events = new QueueEvents(name, { connection: this.redis });

    await queue.drain()

    const options = this.options

    return {
      async addTask(payload: TaskPayload): Promise<{ jobId: string }> {
        const job = await queue.add(name, payload, { attempts: options.retryAttempts ?? 2 });
        return { jobId: job.id! };
      },

      async onCompleted(listener: (result: { jobId: string; payload: TaskPayload }) => void) {
        events.on("completed", async (result) => {
          console.log(result.returnvalue);
          await listener({
            jobId: result.jobId,
            payload: JSON.parse(result.returnvalue) as TaskPayload,
          });
        });
        await events.waitUntilReady()
      },

      async close(): Promise<void> {
        await events.close();
        await queue.close();
      },
    };
  }

  public createWorker(
    name: string,
    executor: (data: TaskPayload) => Promise<TaskPayload>,
    options?: { concurrency: number }
  ): Closeable {
    const worker = new Worker<TaskPayload, string>(
      name,
      async (job) => {
        return JSON.stringify(await executor(job.data));
      },
      { concurrency: options?.concurrency ?? 1, connection: this.redis, metrics: { maxDataPoints: MetricsTime.ONE_HOUR * 24 } }
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
}
