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
}
