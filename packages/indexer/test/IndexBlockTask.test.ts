import "reflect-metadata";
import {
  BlockWithResult,
  InMemoryDatabase,
  LocalTaskQueue,
  WorkerModule,
  TaskPayload,
} from "@proto-kit/sequencer";

import { Indexer } from "../src/Indexer";
import { IndexBlockTask } from "../src/tasks/IndexBlockTask";

describe("IndexBlockTask", () => {
  const indexer = Indexer.from({
    Database: InMemoryDatabase,
    TaskQueue: LocalTaskQueue,
    WorkerModule: WorkerModule.from({
      IndexBlockTask: IndexBlockTask,
    }),
  });

  indexer.configurePartial({
    Database: {},
    TaskQueue: {},
    WorkerModule: {
      IndexBlockTask: {},
    },
  });

  it("should listen to block indexing tasks", async () => {
    await indexer.start();
    const taskQueue = indexer.resolve("TaskQueue");
    const workerModule = indexer.resolve("WorkerModule");
    const indexBlockTask = workerModule.resolve("IndexBlockTask");
    const queue = await taskQueue.getQueue(indexBlockTask.name);
    const block = BlockWithResult.createEmpty();

    const payload = await indexBlockTask.inputSerializer().toJSON([block]);

    const task: TaskPayload = {
      name: indexBlockTask.name,
      payload,
      flowId: "",
      sequencerId: "test-sequencer",
    };

    await queue.addTask(task);

    // LocalTaskQueue voids all the pending promises, so we need this hack
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1000);
    });

    const storage = indexer.resolve("BlockStorage");
    const latestBlock = await storage.getLatestBlock();

    expect(latestBlock?.block.hash.toBigInt()).toBe(
      block.block.hash.toBigInt()
    );
  });
});
