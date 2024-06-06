import "reflect-metadata";

import { afterEach, beforeEach } from "@jest/globals";
import { noop } from "@proto-kit/common";
import { container } from "tsyringe";

import {
  TaskSerializer,
  Closeable,
  LocalTaskQueue,
  Task,
  FlowTaskWorker,
  FlowCreator,
  PairingDerivedInput,
  JSONTaskSerializer,
} from "../../src";

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
class PairedMulTask
  implements Task<PairingDerivedInput<number, bigint, void>, bigint>
{
  public name = "sum";

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

  public resultSerializer(): TaskSerializer<bigint> {
    return {
      fromJSON: (input: string) => {
        return BigInt(input);
      },

      toJSON: (input: bigint) => {
        return BigInt(input).toString();
      },
    };
  }

  public async compute(
    input: PairingDerivedInput<number, bigint, void>
  ): Promise<bigint> {
    return BigInt(input.input1) * input.input2;
  }

  public async prepare(): Promise<void> {
    noop();
  }
}

class NumberDoublingTask implements Task<string, number> {
  public name = "numberDoubling";

  public inputSerializer(): TaskSerializer<string> {
    return JSONTaskSerializer.fromType<string>();
  }

  public resultSerializer(): TaskSerializer<number> {
    return JSONTaskSerializer.fromType<number>();
  }

  public async compute(input: string): Promise<number> {
    return Number.parseInt(input, 10) * 2;
  }

  public async prepare(): Promise<void> {
    noop();
  }
}

class BigIntDoublingTask implements Task<string, bigint> {
  public name = "bigintDoubling";

  public inputSerializer(): TaskSerializer<string> {
    return JSONTaskSerializer.fromType<string>();
  }

  public resultSerializer(): TaskSerializer<bigint> {
    return {
      fromJSON: BigInt,
      toJSON: (input: bigint) => BigInt(input).toString(),
    };
  }

  public async compute(input: string): Promise<bigint> {
    return BigInt(input) * 2n;
  }

  public async prepare(): Promise<void> {
    noop();
  }
}

class BigIntSumTask implements Task<[bigint, bigint], bigint> {
  public name = "bigintreduce";

  public inputSerializer(): TaskSerializer<[bigint, bigint]> {
    return {
      fromJSON: (input) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const dec: [string, string] = JSON.parse(input);
        return dec.map(BigInt) as [bigint, bigint];
      },

      toJSON: (input: [bigint, bigint]) =>
        JSON.stringify(input.map((b) => b.toString(10))),
    };
  }

  // eslint-disable-next-line sonarjs/no-identical-functions
  public resultSerializer(): TaskSerializer<bigint> {
    return {
      fromJSON: BigInt,
      toJSON: (input: bigint) => BigInt(input).toString(),
    };
  }

  public async compute(input: [bigint, bigint]): Promise<bigint> {
    return input[0] + input[1];
  }

  public async prepare(): Promise<void> {
    return undefined;
  }
}

describe("flow", () => {
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
      const worker = new FlowTaskWorker(queue, [
        new PairedMulTask(),
        new NumberDoublingTask(),
        new BigIntDoublingTask(),
        new BigIntSumTask(),
      ]);
      closeables.push(worker);
      await worker.start();

      container.register("TaskQueue", { useValue: queue });
      const flowCreator = container.resolve(FlowCreator);

      const flow = flowCreator.createFlow("1", {
        pairings: inputs.map<[number | undefined, bigint | undefined]>(() => [
          undefined,
          undefined,
        ]),

        reductionQueue: [] as bigint[],
      });

      const numberDoubling = new NumberDoublingTask();
      const bigintDoubling = new BigIntDoublingTask();
      const mulTask = new PairedMulTask();
      const reductionTask = new BigIntSumTask();

      const computedResult = await flow.withFlow<bigint>(async (resolve) => {
        const resolveReduction = async () => {
          let reductions = flow.state.reductionQueue;

          console.log(reductions.length);

          if (reductions.length === 1 && flow.tasksInProgress === 0) {
            resolve(reductions[0]);
          }

          while (reductions.length >= 2) {
            const taskParameters: [bigint, bigint] = [
              reductions[0],
              reductions[1],
            ];
            reductions = reductions.slice(2);
            // We additionally have to set it here,
            // because this loop mights be interrupted
            flow.state.reductionQueue = reductions;
            await flow.pushTask(
              reductionTask,
              taskParameters,
              async (reductionResult) => {
                flow.state.reductionQueue.push(reductionResult);
                await resolveReduction();
              }
            );
          }
        };

        const resolvePairings = async (index: number) => {
          const [first, second] = flow.state.pairings[index];

          if (first !== undefined && second !== undefined) {
            console.log(`Found pairing ${index}`);

            await flow.pushTask(
              mulTask,
              {
                input1: first,
                input2: second,
                params: undefined,
              },
              async (mulTaskResult) => {
                flow.state.reductionQueue.push(mulTaskResult);
                await resolveReduction();
              }
            );
          }
        };

        await flow.forEach(inputs, async (input, index) => {
          await flow.pushTask(
            numberDoubling,
            input[0],
            async (doublingResult) => {
              flow.state.pairings[index][0] = doublingResult;
              await resolvePairings(index);
            }
          );

          await flow.pushTask(
            bigintDoubling,
            input[1],
            async (doublingResult) => {
              flow.state.pairings[index][1] = doublingResult;
              await resolvePairings(index);
            }
          );
        });
      });

      console.log(computedResult);

      expect(computedResult).toStrictEqual(result);
    },
    15_000
  );
});
