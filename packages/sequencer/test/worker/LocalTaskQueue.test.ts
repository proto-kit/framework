import "reflect-metadata";
import { afterEach, describe, jest } from "@jest/globals";
import { sleep } from "@proto-kit/common";

import { TaskPayload, LocalTaskQueue } from "../../src";

describe("localTaskQueue", () => {
  let taskQueue: LocalTaskQueue;

  beforeEach(() => {
    taskQueue = new LocalTaskQueue();
    taskQueue.config = {
      simulatedDuration: 0,
    };

    taskQueue.createWorker("testQueue", async (data: TaskPayload) => data);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([[[1, 2, 3, 4]], [[1, 2]]])(
    "should trigger worker and report results correctly",
    async (inputs) => {
      expect.assertions(inputs.length);

      const queue = await taskQueue.getQueue("testQueue");

      const spy = jest.fn<(payload: TaskPayload) => Promise<void>>(async () => {
        await Promise.resolve();
      });

      await queue.onCompleted(spy);

      for (const [index, input] of inputs.entries()) {
        await queue.addTask({
          name: String(index),
          payload: String(input),
          flowId: "0",
        });
      }

      await sleep(300);

      for (const [index, input] of inputs.entries()) {
        expect(spy).toHaveBeenNthCalledWith(index + 1, {
          name: String(index),
          payload: String(input),
          flowId: "0",
        });
      }
    }
  );
});
