import { MetricsTime, Queue, QueueEvents, Worker } from "bullmq";
import { log, ModuleContainerLike } from "@proto-kit/common";
import {
  TaskPayload,
  Closeable,
  InstantiatedQueue,
  TaskQueue,
  AbstractTaskQueue,
  closeable,
  sequencerModule,
} from "@proto-kit/sequencer";
import { inject } from "tsyringe";
import AsyncLock from "async-lock";

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

/**
 * TaskQueue implementation for BullMQ
 */
@closeable()
@sequencerModule()
export class BullQueue
  extends AbstractTaskQueue<BullQueueConfig>
  implements TaskQueue, Closeable
{
  public constructor(
    @inject("ParentContainer") private parent: ModuleContainerLike
  ) {
    super();
    this.lock = new AsyncLock();
  }

  private workers: Worker[] = [];

  private lock: AsyncLock;

  public createWorker(
    name: string,
    executor: (data: TaskPayload) => Promise<TaskPayload>,
    options?: { concurrency?: number }
  ): Closeable {
    const worker = new Worker<TaskPayload, TaskPayload>(
      name,
      async (job) => {
        // This lock is needed to make sure the worker is not proving in parallel
        // This is by far not optimal - since it still picks up 1 task per queue but waits until
        // computing them, so that leads to bad performance over multiple workers.
        // For that we need to restructure tasks to be flowing through a single queue however
        return await this.lock.acquire("worker-lock", async () => {
          return await executor(job.data);
        });
      },
      {
        concurrency: options?.concurrency ?? 1,
        connection: this.config.redis,
        stalledInterval: 60000 * 5, // 1 minute
        lockDuration: 60000 * 5, // 5 minutes

        metrics: { maxDataPoints: MetricsTime.ONE_HOUR * 24 },
      }
    );

    this.workers.push(worker);

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

  private isMaster() {
    return this.parent.dependencyContainer.isRegistered("BatchProducerModule");
  }

  public async start() {
    if (this.isMaster()) {
      log.debug("Instance is master, draining queue");
      // Drain all queues to clear stale tasks from previous sequencer instances
      await this.drainAllQueues();
    }
  }

  public async close() {
    await this.closeQueues();

    // Closing of active workers is handled by the WorkerModule
  }
}
