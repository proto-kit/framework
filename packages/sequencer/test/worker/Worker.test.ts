import "reflect-metadata";

import {
  MapReduceTask,
  ReducableTask,
  TaskSerializer
} from "../../src/worker/manager/ReducableTask";
import {
  MapReduceTaskRunner,
  ReducingTaskRunner
} from "../../src/worker/manager/WorkerCoordinator";
import { LocalTaskQueue } from "./LocalTaskQueue";
import { TaskWorker } from "../../src/worker/worker/TaskWorker";
import { Closeable, TaskQueue } from "../../src/worker/queue/TaskQueue";
import { BullQueue } from "../../src/worker/queue/BullQueue";

// The implementation of the task, known by both master and worker
class SumTask implements MapReduceTask<number, number>{

  name(): string {
    // Tells the framework from which queues to consume
    return "sum";
  }

  // Worker-executed
  prepare(): Promise<void> {
    // we can call .compile() here for example
    return Promise.resolve(undefined);
  }

  // Master-executed
  reducible(r1: number, r2: number): boolean {
    // Checks if the tasks r1 and r2 fit together and can be reduced
    return true;
  }

  // Worker-executed
  reduce(r1: number, r2: number): Promise<number> {
    console.log("Reducing " + r1 + " + " + r2);
    // Does the actual reducing work
    return Promise.resolve(r1 + r2)
  }

  serializer(): TaskSerializer<number> {
    return {
      fromJSON(s: string): number {
        return Number.parseInt(s);
      },
      toJSON(t: number): string {
        return t + "";
      },
    };
  }

  inputSerializer(): TaskSerializer<number> {
    return this.serializer();
  }

  async map(t: number): Promise<number> {
    return t * 2;
  }
}

describe("worker", () => {
  let closeables: Closeable[] = []

  async function performAfterEach(){
    await Promise.all(closeables.map(x => x.close()))
    closeables = []
  }

  // Doesn't trigger, no idea why
  afterEach(async () => {
    await performAfterEach()
  })

  afterAll(async () => {
    await performAfterEach()
  })

  async function runSumTask(inputs: number[], queue: TaskQueue, task: ReducableTask<number>) : Promise<{ result: number, timeElapsed: number }> {

    // let coord = new WorkerCoordinator(queue)
    let coord = new ReducingTaskRunner(queue, task, "sum")
    closeables.push(coord)

    const start = new Date().getTime()

    //Executes the task on the workers and reports back once the task has been fully reduced
    // let result = await coord.executeReducingTask("sum", task, inputs)
    let result = await coord.executeReduce(inputs)

    const timeElapsed = new Date().getTime() - start

    return { result, timeElapsed };
  }

  async function runSumTaskMapReduce(inputs: number[], queue: TaskQueue, task: MapReduceTask<number, number>) : Promise<{ result: number, timeElapsed: number }> {

    let coord = new MapReduceTaskRunner(queue, task, "sum")
    closeables.push(coord)

    const start = new Date().getTime()

    //Executes the task on the workers and reports back once the task has been fully reduced
    let result = await coord.executeMapReduce(inputs)

    const timeElapsed = new Date().getTime() - start

    return { result, timeElapsed }
  }

  function createLocalQueue() : LocalTaskQueue {
    return new LocalTaskQueue(100);
  }

  function createBullQueue() : BullQueue {
    return new BullQueue({ host: "rpanic.com", port: 6379, password: "protokit" })
  }

  // TODO Change to describe
  describe.each([
    [createLocalQueue, "local"],
    // [createBullQueue, "bullmq"],  // Enable once issue #25 is implemented
  ])("queue", (queueGenerator: () => TaskQueue, testName: string) => {

    const inputs = [
      [[1,2,3,4,6,47,2,745,83,8,589,34,7,62,346,247,458748,47,48,37,123512,346,146,12346,26,2,23,4512,5,125,125,2153,126,2,62,53,2135,1235,2135]],
      [[1,2,3,4,6,47,2,745,83,8,589,34,7,62,346,247,458748,47,48,37]],
      [[1,2,3,4]],
      [[1,2]],
    ];

    it.each(inputs)
    (`should execute reduce correctly: ${testName}`, async (inputs: number[]) => {
      expect.assertions(1)

      const task = new SumTask();

      const sum = inputs.reduce((a, b) => a + b)

      const queue = queueGenerator()

      // Initialize a dummy worker
      let worker = new TaskWorker(queue)
      worker.addReducableTask("sum", task)
      closeables.push(worker)
      await worker.init()

      const { result } = await runSumTask(inputs, queue, task)

      expect(result).toStrictEqual(sum)

      await performAfterEach()
    }, 15*1000)

    it.each(inputs)
    (`should calculate map-reduce multiply-sum correctly: ${testName}`, async (inputs: number[]) => {
      expect.assertions(1)

      const task = new SumTask();

      const sum = inputs.map(x => x * 2).reduce((a, b) => a + b)

      const queue = queueGenerator()

      // Initialize a dummy worker
      let worker = new TaskWorker(queue)
      worker.addMapReduceTask("sum", task)
      closeables.push(worker)
      await worker.init()

      const { result } = await runSumTaskMapReduce(inputs, queue, task)

      expect(result).toStrictEqual(sum)

      await performAfterEach()
    }, 15_000)

  })

  // it.skip.each([
  //   [[1,2,3,4,6,47,2,745,83,8,589,34,7,62,346,247,458748,47,48,37]],
  //   [[1,2,3,4]],
  //   [[1,2]],
  // ])
  // ("should calculate sum correctly locally", async (inputs: number[]) => {
  //   expect.assertions(1)
  //
  //   const task = new SumTask();
  //
  //   let localQueue = new LocalTaskQueue(100)
  //
  //   const sum = inputs.reduce((a, b) => a + b)
  //
  //   // Initialize a dummy worker
  //   let worker = new TaskWorker(localQueue)
  //   worker.addReducableTask("sum", task)
  //   closeables.push(worker)
  //   await worker.init()
  //
  //   const { result } = await runSumTask(inputs, localQueue, task)
  //
  //   expect(result).toStrictEqual(sum)
  //
  //   await performAfterEach()
  // }, 15_000)
  //
  // it.skip.each([
  //   [[1,2,3,4,6,47,2,745,83,8,589,34,7,62,346,247,458748,47,48,37,123512,346,146,12346,26,2,23,4512,5,125,125,2153,126,2,62,53,2135,1235,2135]],
  //   [[1,2,3,4,6,47,2,745,83,8,589,34,7,62,346,247,458748,47,48,37]],
  //   [[1,2,3,4]],
  //   [[1,2]],
  // ])
  // ("should calculate sum correctly with redis", async (inputs: number[]) => {
  //   expect.assertions(1)
  //
  //   const task = new SumTask();
  //
  //   let bullQueue = new BullQueue({ host: "rpanic.com", port: 6379, password: "protokit" })
  //
  //   const sum = inputs.reduce((a, b) => a + b)
  //
  //   // Initialize a dummy worker
  //   let worker = new TaskWorker(bullQueue)
  //   worker.addReducableTask("sum", task)
  //   closeables.push(worker)
  //   await worker.init()
  //
  //   const { result } = await runSumTask(inputs, bullQueue, task)
  //
  //   expect(result).toStrictEqual(sum)
  //
  //   await performAfterEach()
  // }, 15*1000)
  //
  // it.skip.each([
  //   [[1,2,3,4]],
  // ])
  // ("should calculate map-reduce multiply-sum correctly", async (inputs: number[]) => {
  //   expect.assertions(1)
  //
  //   const task = new SumTask();
  //
  //   let bullQueue = new BullQueue({ host: "rpanic.com", port: 6379, password: "protokit" })
  //
  //   const sum = inputs.map(x => x * 2).reduce((a, b) => a + b)
  //
  //   // Initialize a dummy worker
  //   let worker = new TaskWorker(bullQueue)
  //   worker.addMapReduceTask("sum", task)
  //   closeables.push(worker)
  //   await worker.init()
  //
  //   const { result } = await runSumTaskMapReduce(inputs, bullQueue, task)
  //
  //   expect(result).toStrictEqual(sum)
  //
  //   await performAfterEach()
  // }, 15_000)
})