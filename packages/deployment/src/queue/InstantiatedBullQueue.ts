import {
  InstantiatedQueue,
  ListenerList,
  TaskPayload,
} from "@proto-kit/sequencer";
import { log } from "@proto-kit/common";
import { Queue, QueueEvents } from "bullmq";

export class InstantiatedBullQueue implements InstantiatedQueue {
  public constructor(
    public readonly name: string,
    private readonly queue: Queue,
    private readonly events: QueueEvents,
    private readonly options: {
      retryAttempts?: number;
    }
  ) {}

  initialized = false;

  listeners = new ListenerList<TaskPayload>();

  public async initialize() {
    await this.queue.drain();
  }

  public async addTask(payload: TaskPayload): Promise<{ taskId: string }> {
    log.debug("Adding task: ", payload);
    const job = await this.queue.add(this.name, payload, {
      attempts: this.options.retryAttempts ?? 2,
    });
    return { taskId: job.id! };
  }

  async onCompleted(listener: (payload: TaskPayload) => Promise<void>) {
    if (!this.initialized) {
      await this.events.waitUntilReady();

      this.events.on("completed", async (result) => {
        log.debug("Completed task: ", result);
        try {
          await this.listeners.executeListeners(
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            result.returnvalue as unknown as TaskPayload
          );
        } catch (e) {
          // Catch error explicitly since this promise is dangling,
          // therefore any error will be voided as well
          log.error(e);
        }
      });
      this.events.on("error", async (error) => {
        log.error("Error in worker", error);
      });
      this.initialized = true;
    }

    return this.listeners.pushListener(listener);
  }

  async offCompleted(listenerId: number) {
    this.listeners.removeListener(listenerId);
  }

  async close(): Promise<void> {
    await this.events.close();
    await this.queue.drain();
    await this.queue.close();
  }
}
