import "reflect-metadata";
// eslint-disable-next-line @typescript-eslint/no-shadow
import { afterEach, beforeEach } from "@jest/globals";
import { noop } from "@proto-kit/common";

import {
  JSONTaskSerializer,
  MappingTask,
  MapReduceTask,
  TaskSerializer,
} from "../../src/worker/manager/ReducableTask";
import {
  PairingDerivedInput,
  PairingMapReduceFlow,
} from "../../src/worker/manager/PairingMapReduceFlow";
import { TaskWorker } from "../../src/worker/worker/TaskWorker";
import { Closeable } from "../../src/worker/queue/TaskQueue";
import { LocalTaskQueue } from "../../src/worker/queue/LocalTaskQueue";

/**
 * The two Sum tasks are only used to showcase the task framework in its full
 * capability
 *
 * Be aware that this tasks are just some mocks to test the framework.
 *
 * The workflow for these two tasks is as follows:
 * Inputs are tuples of [string, string] where each string is a number-ish.
 * These inputs then get mapped to [number, bigint] and paired together as soon
 * as they are ready.
 *
 * Why number and bigint? To test that these properties can be different types.
 * The pairs are then mapped: number * bigint
 * And then reduced by summing them together: bigint + bigint
 */
class PairedSumTask
  implements MapReduceTask<PairingDerivedInput<number, bigint, void>, bigint>
{
  public inputSerializer(): TaskSerializer<
    PairingDerivedInput<number, bigint, void>
  > {
    return {
      fromJSON: (json: string) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const jsonReadyObject: { input1: number; input2: string } =
          JSON.parse(json);

        return {
          input1: jsonReadyObject.input1,
          input2: BigInt(jsonReadyObject.input2),
          params: undefined,
        };
      },

      toJSON: (input: PairingDerivedInput<number, bigint, void>) =>
        JSON.stringify({
          input1: input.input1,
          input2: BigInt(input.input2).toString(),
          params: undefined,
        }),
    };
  }

  public name(): string {
    return "sum";
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public reducible(r1: bigint, r2: bigint): boolean {
    return true;
  }

  public resultSerializer(): TaskSerializer<bigint> {
    return {
      fromJSON: BigInt,
      toJSON: (input: bigint) => BigInt(input).toString(),
    };
  }

  public async map(
    input: PairingDerivedInput<number, bigint, void>
  ): Promise<bigint> {
    return BigInt(input.input1) * input.input2;
  }

  public async prepare(): Promise<void> {
    noop();
  }

  public async reduce(r1: bigint, r2: bigint): Promise<bigint> {
    return r1 + r2;
  }
}

class NumberDoublingTask implements MappingTask<string, number> {
  public inputSerializer(): TaskSerializer<string> {
    return JSONTaskSerializer.fromType<string>();
  }

  public resultSerializer(): TaskSerializer<number> {
    return JSONTaskSerializer.fromType<number>();
  }

  public name(): string {
    return "numberDoubling";
  }

  public async map(input: string): Promise<number> {
    return Number.parseInt(input, 10) * 2;
  }

  public async prepare(): Promise<void> {
    noop();
  }
}

class BigIntDoublingTask implements MappingTask<string, bigint> {
  public inputSerializer(): TaskSerializer<string> {
    return JSONTaskSerializer.fromType<string>();
  }

  public resultSerializer(): TaskSerializer<bigint> {
    return {
      fromJSON: BigInt,
      toJSON: (input: bigint) => BigInt(input).toString(),
    };
  }

  public name(): string {
    return "bigintDoubling";
  }

  public async map(input: string): Promise<bigint> {
    return BigInt(input) * 2n;
  }

  public async prepare(): Promise<void> {
    noop();
  }
}

describe("twoStepRunner", () => {
  let closeables: Closeable[];

  beforeEach(() => {
    closeables = [];
  });

  afterEach(async () => {
    // Avoid race condition
    const toClose = closeables;
    closeables = [];
    await Promise.all(
      toClose.map(async (x) => {
        await x.close();
      })
    );
  });

  it.each<[[string, string][]]>([
    [
      [
        ["1", "2"],
        ["3", "4"],
      ],
    ],
    [
      [
        ["1", "2"],
        ["3", "4"],
        ["5", "6"],
        ["7", "8"],
        ["9", "100"],
      ],
    ],
  ])(
    "should arrive at correct result",
    async (inputs: [string, string][]) => {
      expect.assertions(1);

      const result = inputs
        .map<[number, bigint]>((input) => [
          Number.parseInt(input[0], 10) * 2,
          BigInt(input[1]) * 2n,
        ])
        .map((mapped) => BigInt(mapped[0]) * mapped[1])
        .reduce((a, b) => a + b);

      console.log(result);

      const queue = new LocalTaskQueue();
      queue.config = {
        simulatedDuration: 100,
      };

      // Create worker
      const worker = new TaskWorker(queue);
      worker.addMapReduceTask("sumqueue", new PairedSumTask());
      worker.addMapTask("sumqueue", new NumberDoublingTask());
      worker.addMapTask("sumqueue", new BigIntDoublingTask());
      closeables.push(worker);
      await worker.start();

      // Create runner
      const flow = new PairingMapReduceFlow(queue, "sumqueue", {
        firstPairing: new NumberDoublingTask(),
        secondPairing: new BigIntDoublingTask(),
        reducingTask: new PairedSumTask(),
      });

      // Add undefined as AdditionalParams
      const paramedInputs = inputs.map<[string, string, undefined]>((input) => [
        input[0],
        input[1],
        undefined,
      ]);
      const computedResult = await flow.executePairingMapReduce(
        "0",
        paramedInputs,
        Array.from({ length: paramedInputs.length }, (item, index) =>
          String(index)
        )
      );

      console.log(computedResult);

      expect(computedResult).toStrictEqual(result);
    },
    15_000
  );
});
