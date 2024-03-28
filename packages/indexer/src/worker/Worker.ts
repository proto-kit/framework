import { inject, injectable } from "tsyringe";
import { IndexerModule } from "../IndexerModule";
import { TaskQueue, TaskPayload } from "@proto-kit/sequencer";
import { IndexerNotifier } from "../IndexerNotifier";
import { Database } from "../database/Database";
import { IndexBlockTask } from "../tasks/IndexBlockTask";
import { BlockStorage } from "../database/BlockStorage";

@injectable()
export class Worker extends IndexerModule<Record<never, never>> {
  public constructor(
    @inject("TaskQueue") public taskQueue: TaskQueue,
    @inject("BlockStorage") public blockStorage: BlockStorage,
    public indexBlockTask: IndexBlockTask
  ) {
    super();
  }

  public async workBlockTask(task: TaskPayload): Promise<TaskPayload> {
    const block = this.indexBlockTask.inputSerializer().fromJSON(task.payload);

    this.blockStorage.pushBlock(block);
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
}
