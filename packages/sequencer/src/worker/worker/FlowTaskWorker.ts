import { log } from "@proto-kit/common";

import { Closeable, TaskQueue } from "../queue/TaskQueue";
import { Task, TaskPayload } from "../flow/Task";

const errors = {
  notComputable: (name: string) =>
    new Error(`Task ${name} not computable on selected worker`),
};

type InferTaskInput<TaskT extends Task<any, any>> =
  TaskT extends Task<infer Input, unknown> ? Input : never;

type InferTaskOutput<TaskT extends Task<any, any>> =
  TaskT extends Task<unknown, infer Output> ? Output : never;

// Had to use any here, because otherwise you couldn't assign any tasks to it
export class FlowTaskWorker<Tasks extends Task<any, any>[]>
  implements Closeable
{
  private readonly queue: TaskQueue;

  private workers: Closeable[] = [];

  public constructor(
    mq: TaskQueue,
    private readonly tasks: Tasks
  ) {
    this.queue = mq;
  }

  // The array type is this weird, because we first want to extract the
  // element type, and after that, we expect multiple elements of that -> []
  private initHandler<Input, Output>(task: Task<Input, Output>) {
    const queueName = task.name;
    return this.queue.createWorker(queueName, async (data) => {
      log.debug(`Received task in queue ${queueName}`);

      try {
        // Use first handler that returns a non-undefined result
        const input = await task.inputSerializer().fromJSON(data.payload);

        const output: Output = await task.compute(input);

        if (output === undefined) {
          throw errors.notComputable(data.name);
        }

        const result: TaskPayload = {
          status: "success",
          taskId: data.taskId,
          flowId: data.flowId,
          name: data.name,
          payload: await task.resultSerializer().toJSON(output),
        };

        return result;
      } catch (error: unknown) {
        const payload =
          error instanceof Error ? error.message : JSON.stringify(error);

        return {
          status: "error",
          taskId: data.taskId,
          flowId: data.flowId,
          name: data.name,
          payload,
        };
      }
    });
  }

  public async start() {
    // Call all task's prepare() method
    // Call them in order of registration, because the prepare methods
    // might depend on each other or a result that is saved in a DI singleton
    for (const task of this.tasks) {
      // eslint-disable-next-line no-await-in-loop
      await task.prepare();
    }

    this.workers = this.tasks.map((task: Task<unknown, unknown>) =>
      this.initHandler<
        InferTaskInput<typeof task>,
        InferTaskOutput<typeof task>
      >(task)
    );
  }

  public async close() {
    await Promise.all(
      this.workers.map(async (worker) => {
        await worker.close();
      })
    );
  }
}
