import { SequencerModule } from "../../sequencer/builder/SequencerModule";

import type { InstantiatedQueue } from "./TaskQueue";

export abstract class AbstractTaskQueue<
  Config,
> extends SequencerModule<Config> {
  protected queues: Record<string, InstantiatedQueue> = {};

  protected createOrGetQueue(
    name: string,
    creator: (name: string) => InstantiatedQueue
  ): InstantiatedQueue {
    if (this.queues[name] === undefined) {
      this.queues[name] = creator(name);
    }
    return this.queues[name];
  }

  protected async closeQueues() {
    await Promise.all(
      Object.values(this.queues).map(async (queue) => await queue.close())
    );
  }

  public async drainAllQueues(): Promise<void> {
    await Promise.all(
      Object.values(this.queues).map(async (queue) => await queue.drain())
    );
  }
}
