import {
  JSONTaskSerializer,
  MapReduceTask,
  PairedMapTask,
  TaskSerializer
} from "../../src/worker/manager/ReducableTask";
import { TwoStageTaskRunner } from "../../src/worker/manager/TwoStageTaskRunner";
import { LocalTaskQueue } from "./LocalTaskQueue";
import { TaskWorker } from "../../src/worker/worker/TaskWorker";
import { Closeable } from "../../src/worker/queue/TaskQueue";
import { afterEach, beforeEach } from "@jest/globals";

/**
 * The two Sum tasks are only used to showcase the task framework in it's fully capability
 *
 * Be aware that this tasks are just some mocks to test the framework.
 *
 * The workflow for these two tasks is as follows:
 * Inputs are tuples of [string, string] where each string is a number-ish.
 * These inputs then get mapped to [number, bigint] and paired together as soon as they are ready
 * Why number and bigint? To test that these properties can be different types.
 * The pairs are then mapped: number * bigint
 * And then reduced by summing them together: bigint + bigint
 */
class PairedSumTask implements MapReduceTask<[number, bigint, void], bigint> {

  public inputSerializer(): TaskSerializer<[number, bigint, void]> {
    return {
      fromJSON: (s: string) => {
        const arr = JSON.parse(s) as [number, number]
        return [arr[0], BigInt(arr[1]), undefined]
      },
      toJSON: (t: [number, bigint, void]) => `[${t[0]},${BigInt(t[1]).toString()}]`
    }
  }

  public async map(input: [number, bigint, void]): Promise<bigint> {
    console.log("Input: " + input);
    return BigInt(input[0]) * input[1];
  }

  public name(): string {
    return "sum";
  }

  public async prepare(): Promise<void> {
  }

  public async reduce(r1: bigint, r2: bigint): Promise<bigint> {
    return r1 + r2;
  }

  public reducible(r1: bigint, r2: bigint): boolean {
    return true;
  }

  public serializer(): TaskSerializer<bigint> {
    return {
      fromJSON: (s: string) => BigInt(s),
      toJSON: (t: bigint) => BigInt(t).toString()
    }
  }
}

class PairedSumPreTask implements PairedMapTask<string, number, string, bigint>{

  public async mapOne(input: string): Promise<number> {
    return Number.parseInt(input) * 2;
  }

  public async mapTwo(input: string): Promise<bigint> {
    return BigInt(input) * 2n;
  }

  public name(): string {
    return "sum";
  }

  public async prepare(): Promise<void> {}

  public serializers(): {
    input1: TaskSerializer<string>;
    output1: TaskSerializer<number>;
    input2: TaskSerializer<string>;
    output2: TaskSerializer<bigint>;
  } {
    return {
      input1: JSONTaskSerializer.fromType<string>(),
      output1: JSONTaskSerializer.fromType<number>(),
      input2: JSONTaskSerializer.fromType<string>(),
      output2: {
        fromJSON: (s: string) => BigInt(s),
        toJSON: (t: bigint) => BigInt(t).toString()
      },
    };
  }
}

describe("twoStepRunner", () => {
  let closeables: Closeable[];

  beforeEach(() => {
    closeables = [];
  })

  afterEach(async () => {
    await Promise.all(closeables.map((x) => x.close()));
    closeables = [];
  })

  it.each<[[string, string][]]>([
    [[["1", "2"], ["3", "4"]]],
    [[["1", "2"], ["3", "4"], ["5", "6"], ["7", "8"], ["9", "100"]]],
  ])("should arrive at correct result", async (inputs: [string, string][]) => {

    const result = inputs
      .map<[number, bigint]>(input => [parseInt(input[0]) * 2, BigInt(input[1]) * 2n])
      .map(mapped => BigInt(mapped[0]) * mapped[1])
      .reduce((a, b) => a + b)

    console.log(result);

    const queue = new LocalTaskQueue(100)

    // Create worker
    const worker = new TaskWorker(queue);
    worker.addMapReduceTask("sumqueue", new PairedSumTask());
    worker.addPairedMapTask("sumqueue", new PairedSumPreTask());
    closeables.push(worker);
    await worker.init();

    // Create runner
    const runner = new TwoStageTaskRunner(
      queue,
      "sumqueue",
      new PairedSumTask(),
      new PairedSumPreTask()
    )

    // Add undefined as AdditionalParams
    const paramedInputs = inputs.map<[string, string, undefined]>(input => [input[0], input[1], undefined])
    const computedResult = await runner.executeTwoStageMapReduce(paramedInputs)

    console.log(computedResult);

    expect(computedResult).toStrictEqual(result)

  }, 15_000)

})