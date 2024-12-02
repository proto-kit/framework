import { MetricsTime, Queue, QueueEvents, Worker } from "bullmq";
import { log, noop } from "@proto-kit/common";
import {
  TaskPayload,
  Closeable,
  InstantiatedQueue,
  TaskQueue,
  AbstractTaskQueue,
} from "@proto-kit/sequencer";

import { InstantiatedBullQueue } from "./InstantiatedBullQueue";

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

interface BullWorker extends Closeable {
  get worker(): Worker;
}

/**
 * TaskQueue implementation for BullMQ
 */
export class BullQueue
  extends AbstractTaskQueue<BullQueueConfig>
  implements TaskQueue
{
  private activePromise?: Promise<void>;

  private activeWorkers: Record<string, BullWorker> = {};
  private activeJobs = 0;

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
        this.activeJobs += 1;

        // TODO Use worker.pause()
        while (this.activePromise !== undefined) {
          // eslint-disable-next-line no-await-in-loop
          await this.activePromise;
        }
        let resOutside: () => void = () => {};
        const promise = new Promise<void>((res) => {
          resOutside = res;
        });
        this.activePromise = promise;

        // Pause all other workers
        const workersToPause = Object.entries(this.activeWorkers).filter(
          ([key]) => key !== name
        );
        await Promise.all(
          workersToPause.map(([, workerToPause]) =>
            workerToPause.worker.pause(true)
          )
        );

        const result = await executor(job.data);
        this.activePromise = undefined;
        void resOutside();

        this.activeJobs -= 1;
        if (this.activeJobs === 0) {
          Object.entries(this.activeWorkers).forEach(([, resumingWorker]) =>
            resumingWorker.worker.resume()
          );
        }

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

    const instantiatedWorker = {
      async close() {
        await worker.close();
      },
      get worker() {
        return worker;
      },
    };
    this.activeWorkers[name] = instantiatedWorker;
    return instantiatedWorker;
  }

  public async getQueue(queueName: string): Promise<InstantiatedQueue> {
    return this.createOrGetQueue(queueName, (name) => {
      log.debug(`Creating bull queue ${queueName}`);

      const { redis } = this.config;

      const queue = new Queue<TaskPayload, TaskPayload>(queueName, {
        connection: redis,
      });
      const events = new QueueEvents(queueName, { connection: redis });

      return new InstantiatedBullQueue(name, queue, events, this.config);
    });
  }

  public async start() {
    noop();
  }
}
