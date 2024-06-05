import "reflect-metadata";

import { beforeAll } from "@jest/globals";

import { Closeable, TaskQueue } from "../../src/worker/queue/TaskQueue";
import { BullQueue } from "../../src/worker/queue/BullQueue";
import { LocalTaskQueue } from "../../src/worker/queue/LocalTaskQueue";

// // The implementation of the task, known by both master and worker
// class SumTask implements MapReduceTask<number, number> {
//   public name(): string {
//     // Tells the framework from which sub-queues to consume
//     return "sum";
//   }
//
//   // Master-executed
//
//   public reducible(r1: number, r2: number): boolean {
//     // Checks if the tasks r1 and r2 fit together and can be reduced
//     return true;
//   }
//
//   public resultSerializer(): TaskSerializer<number> {
//     return {
//       fromJSON(json: string): number {
//         return Number.parseInt(json, 10);
//       },
//
//       toJSON(number: number): string {
//         return String(number).toString();
//       },
//     };
//   }
//
//   public inputSerializer(): TaskSerializer<number> {
//     return this.resultSerializer();
//   }
//
//   // Worker-executed
//   public async prepare(): Promise<void> {
//     // we can call .compile() here for example
//   }
//
//   // Worker-executed
//   public async reduce(r1: number, r2: number): Promise<number> {
//     // Does the actual reducing work
//     return r1 + r2;
//   }
//
//   public async map(input: number): Promise<number> {
//     return input * 2;
//   }
// }

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

  function createLocalQueue(): LocalTaskQueue {
    const queue = new LocalTaskQueue();
    queue.config = {
      simulatedDuration: 100,
    };
    return queue;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function createBullQueue(): BullQueue {
    return new BullQueue({
      host: "rpanic.com",
      port: 6379,
      password: "protokit",
    });
  }

  it("", () => {
    expect(1).toBe(1);
  });

  describe.each([
    [createLocalQueue, "local"],
    // [createBullQueue, "bullmq"],  // Enable once issue #25 is implemented
  ])("queue", (queueGenerator: () => TaskQueue, testName: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // it.each(inputs)(
    //   `should calculate map-reduce multiply-sum correctly: ${testName}`,
    //   async (input: number[]) => {
    //     expect.assertions(1);
    //
    //     const task = new SumTask();
    //
    //     const sum = input.map((x) => x * 2).reduce((a, b) => a + b);
    //
    //     const queue = queueGenerator();
    //
    //     // Initialize a dummy worker
    //     const worker = new TaskWorker(queue);
    //     worker.addMapReduceTask("sum_map", task);
    //     closeables.push(worker);
    //     await worker.start();
    //
    //     const { result } = await runSumTaskMapReduce(input, queue, task);
    //
    //     expect(result).toStrictEqual(sum);
    //
    //     await performAfterEach();
    //   },
    //   15_000
    // );
  });

  // it("worker.init should call prepare", async () => {
  //   expect.assertions(1);
  //
  //   const mock = jest.fn(async () => {
  //     await Promise.resolve();
  //   });
  //   const task = new SumTask();
  //   task.prepare = mock;
  //
  //   const worker = new TaskWorker(createLocalQueue());
  //   worker.addMapReduceTask("sum", task);
  //   closeables.push(worker);
  //   await worker.start();
  //
  //   expect(mock).toHaveBeenCalledTimes(1);
  // });
});
