import { inject, injectable } from "tsyringe";
import {
  TaskQueue,
  TaskPayload,
  UnprovenBlockStorage,
} from "@proto-kit/sequencer";

import { IndexerModule } from "../IndexerModule";
import { IndexerNotifier } from "../IndexerNotifier";
import { IndexBlockTask } from "../tasks/IndexBlockTask";

@injectable()
export class Worker extends IndexerModule<Record<never, never>> {
  public constructor(
    @inject("TaskQueue") public taskQueue: TaskQueue,
    @inject("BlockStorage") public blockStorage: UnprovenBlockStorage,
    public indexBlockTask: IndexBlockTask
  ) {
    super();
  }

  public async workBlockTask(task: TaskPayload): Promise<TaskPayload> {
    const input = await this.indexBlockTask
      .inputSerializer()
      .fromJSON(task.payload);

    this.indexBlockTask.compute(input);
    return {
      ...task,
      status: "success",
    };
  }

  public async initialize() {
    this.taskQueue.createWorker(
      IndexerNotifier.indexerQueueName,
      async (task: TaskPayload) => await this.workBlockTask(task)
    );
  }

  public async start() {
    return await Promise.resolve();
  }
}
