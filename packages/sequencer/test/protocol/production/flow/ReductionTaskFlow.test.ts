import "reflect-metadata";
import { container, DependencyContainer } from "tsyringe";
import { noop, sleep } from "@proto-kit/common";

import {
  FlowCreator,
  FlowTaskWorker,
  JSONTaskSerializer,
  LocalTaskQueue,
  PairTuple,
  ReductionTaskFlow,
  Task,
  TaskSerializer,
  TaskWorkerModule,
} from "../../../../src";

type IndexNumber = {
  index: number;
  value: number;
};

type RangeSum = {
  from: number;
  to: number;
  value: number;
};

class PairedMulTask
  extends TaskWorkerModule
  implements Task<PairTuple<RangeSum>, RangeSum>
{
  public name = "sum";

  public inputSerializer(): TaskSerializer<PairTuple<RangeSum>> {
    return JSONTaskSerializer.fromType<PairTuple<RangeSum>>();
  }

  public resultSerializer(): TaskSerializer<RangeSum> {
    return JSONTaskSerializer.fromType<RangeSum>();
  }

  public async compute([a, b]: PairTuple<RangeSum>): Promise<RangeSum> {
    return {
      from: a.from,
      to: b.to,
      value: a.value + b.value,
    };
  }

  public async prepare(): Promise<void> {
    noop();
  }
}

class NumberIdentityTask
  extends TaskWorkerModule
  implements Task<IndexNumber, RangeSum>
{
  public name = "numberIdentity";

  public inputSerializer(): TaskSerializer<IndexNumber> {
    return JSONTaskSerializer.fromType<IndexNumber>();
  }

  public resultSerializer(): TaskSerializer<RangeSum> {
    return JSONTaskSerializer.fromType<RangeSum>();
  }

  public async compute(input: IndexNumber): Promise<RangeSum> {
    return {
      from: input.index,
      to: input.index + 1,
      value: input.value,
    };
  }

  public async prepare(): Promise<void> {
    noop();
  }
}

describe("ReductionTaskFlow", () => {
  let di: DependencyContainer;
  beforeAll(async () => {
    di = container.createChildContainer();

    const queue = new LocalTaskQueue();
    queue.config = {};

    di.register("TaskQueue", {
      useValue: queue,
    });

    const worker = new FlowTaskWorker(di.resolve("TaskQueue"), [
      di.resolve(NumberIdentityTask),
      di.resolve(PairedMulTask),
    ]);
    await worker.start();
  });

  it("regressions - should work for parallel result stream", async () => {
    expect.assertions(1);

    const creator = di.resolve(FlowCreator);
    const flow = new ReductionTaskFlow<IndexNumber, RangeSum>(
      {
        inputLength: 5,
        mappingTask: di.resolve(NumberIdentityTask),
        reductionTask: di.resolve(PairedMulTask),
        name: "test",
        mergableFunction: (a, b) => {
          return a.to === b.from;
        },
      },
      creator
    );

    // eslint-disable-next-line no-async-promise-executor
    const result = await new Promise(async (res) => {
      flow.onCompletion(async (output) => res(output));

      await flow.pushInput({ index: 0, value: 1 });
      await flow.pushInput({ index: 1, value: 2 });
      await flow.pushInput({ index: 2, value: 3 });

      await sleep(100);

      await flow.pushInput({ index: 3, value: 4 });
      await flow.pushInput({ index: 4, value: 0 });
    });

    const expected: RangeSum = {
      from: 0,
      to: 5,
      value: 1 + 2 + 3 + 4,
    };

    expect(result).toStrictEqual(expected);
  }, 1000000);
});
