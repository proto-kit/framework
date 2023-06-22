import "reflect-metadata";

// eslint-disable-next-line @typescript-eslint/no-shadow
import { beforeAll } from "@jest/globals";

import {
  MapReduceTask,
  ReducableTask,
  TaskSerializer,
} from "../../src/worker/manager/ReducableTask";
import { TaskWorker } from "../../src/worker/worker/TaskWorker";
import { Closeable, TaskQueue } from "../../src/worker/queue/TaskQueue";
import { BullQueue } from "../../src/worker/queue/BullQueue";

import { LocalTaskQueue } from "./LocalTaskQueue";
import { MapReduceTaskRunner } from "../../dist/worker/manager/MapReduceTaskRunner";

// The implementation of the task, known by both master and worker
class SumTask implements MapReduceTask<number, number> {
  public name(): string {
    // Tells the framework from which sub-queues to consume
    return "sum";
  }

  // Master-executed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public reducible(r1: number, r2: number): boolean {
    // Checks if the tasks r1 and r2 fit together and can be reduced
    return true;
  }

  public resultSerializer(): TaskSerializer<number> {
    return {
      fromJSON(json: string): number {
        return Number.parseInt(json, 10);
      },

      toJSON(number: number): string {
        return String(number).toString();
      },
    };
  }

  public inputSerializer(): TaskSerializer<number> {
    return this.resultSerializer();
  }

  // Worker-executed
  public async prepare(): Promise<void> {
    // we can call .compile() here for example
  }

  // Worker-executed
  public async reduce(r1: number, r2: number): Promise<number> {
    console.log(`Reducing ${r1} + ${r2}`);
    // Does the actual reducing work
    return r1 + r2;
  }

  public async map(input: number): Promise<number> {
    return input * 2;
  }
}

describe("worker", () => {
  let closeables: Closeable[];

  async function performAfterEach() {
    const toClose = closeables;
    closeables = [];
    await Promise.all(
      toClose.map(async (x) => {
        await x.close();
      })
    );
  }

  beforeAll(() => {
    closeables = [];
  });

  // Doesn't trigger, no idea why
  afterEach(async () => {
    await performAfterEach();
  });

  afterAll(async () => {
    await performAfterEach();
  });

  async function runSumTaskMapReduce(
    inputs: number[],
    queue: TaskQueue,
    task: MapReduceTask<number, number>
  ): Promise<{ result: number; timeElapsed: number }> {
    const coord = new MapReduceTaskRunner(queue, task, "sum_map");
    closeables.push(coord);

    const start = Date.now();

    // Executes the task on the workers and reports back once the task has been
    // fully reduced
    const result = await coord.executeMapReduce(inputs);

    const timeElapsed = Date.now() - start;

    return { result, timeElapsed };
  }

  function createLocalQueue(): LocalTaskQueue {
    return new LocalTaskQueue(100);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function createBullQueue(): BullQueue {
    return new BullQueue({
      host: "rpanic.com",
      port: 6379,
      password: "protokit",
    });
  }

  describe.each([
    [createLocalQueue, "local"],
    // [createBullQueue, "bullmq"],  // Enable once issue #25 is implemented
  ])("queue", (queueGenerator: () => TaskQueue, testName: string) => {
    const inputs = [
      [
        [
          1, 2, 3, 4, 6, 47, 2, 745, 83, 8, 589, 34, 7, 62, 346, 247, 458_748,
          47, 48, 37, 123_512, 346, 146, 12_346, 26, 2, 23, 4512, 5, 125, 125,
          2153, 126, 2, 62, 53, 2135, 1235, 2135,
        ],
      ],
      [
        [
          1, 2, 3, 4, 6, 47, 2, 745, 83, 8, 589, 34, 7, 62, 346, 247, 458_748,
          47, 48, 37,
        ],
      ],
      [[1, 2, 3, 4]],
      [[1, 2]],
    ];

    it.each(inputs)(
      `should calculate map-reduce multiply-sum correctly: ${testName}`,
      async (input: number[]) => {
        expect.assertions(1);

        const task = new SumTask();

        const sum = input.map((x) => x * 2).reduce((a, b) => a + b);

        const queue = queueGenerator();

        // Initialize a dummy worker
        const worker = new TaskWorker(queue);
        worker.addMapReduceTask("sum_map", task);
        closeables.push(worker);
        await worker.init();

        const { result } = await runSumTaskMapReduce(input, queue, task);

        expect(result).toStrictEqual(sum);

        await performAfterEach();
      },
      15_000
    );
  });
});
