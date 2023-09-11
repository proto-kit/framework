// eslint-disable-next-line import/no-extraneous-dependencies
import groupBy from "lodash/groupBy";
import { ArrayElement, log } from "@yab/common";

import {
  AbstractTask,
  MappingTask,
  MapReduceTask,
  ReducableTask,
  TaskPayload,
} from "../manager/ReducableTask";
import { Closeable, TaskQueue } from "../queue/TaskQueue";
import { TASKS_REDUCE_SUFFIX } from "../manager/MapReduceFlow";

const errors = {
  notComputable: (name: string) =>
    new Error(`Task ${name} not computable on selected worker`),
};

export class TaskWorker implements Closeable {
  private readonly tasks: {
    queue: string;
    task: AbstractTask;
    handler: (payload: TaskPayload) => Promise<TaskPayload | undefined>;
  }[] = [];

  private readonly queue: TaskQueue;

  private workers: Closeable[] = [];

  public constructor(mq: TaskQueue) {
    this.queue = mq;
  }

  public addReducableTask<Result>(queue: string, task: ReducableTask<Result>) {
    this.tasks.push({
      queue,
      task,

      handler: async (payload) => {
        if (payload.name === `${task.name()}${TASKS_REDUCE_SUFFIX}`) {
          return await this.doReduceStep(task, payload);
        }
        return undefined;
      },
    });
  }

  public addMapReduceTask<Input, Result>(
    queue: string,
    task: MapReduceTask<Input, Result>
  ) {
    this.tasks.push({
      queue,
      task,

      handler: async (payload) => {
        if (payload.name === task.name()) {
          return await this.doMapStep(task, payload);
        }
        if (payload.name === `${task.name()}${TASKS_REDUCE_SUFFIX}`) {
          return await this.doReduceStep(task, payload);
        }
        return undefined;
      },
    });
  }

  public addMapTask<Input, Result>(
    queue: string,
    task: MappingTask<Input, Result>
  ) {
    this.tasks.push({
      queue,
      task,

      handler: async (payload) => {
        if (payload.name === task.name()) {
          return await this.doMapStep(task, payload);
        }
        return undefined;
      },
    });
  }

  // The array type is this weird, because we first want to extract the
  // element type, and after that, we expect multiple elements of that -> []
  private initHandler(
    queueName: string,
    tasks: ArrayElement<typeof this.tasks>[]
  ) {
    return this.queue.createWorker(queueName, async (data) => {
      log.debug(`Received task in queue ${queueName}`);

      // Use first handler that returns a non-undefined result
      // eslint-disable-next-line @typescript-eslint/init-declarations
      let result: TaskPayload | undefined;
      for (const task of tasks) {
        // eslint-disable-next-line no-await-in-loop
        const candidate = await task.handler(data);

        if (candidate !== undefined) {
          result = candidate;
          break;
        }
      }

      if (result === undefined) {
        throw errors.notComputable(data.name);
      }

      return result;
    });
  }

  private async doReduceStep<Result>(
    task: ReducableTask<Result>,
    payload: TaskPayload
  ): Promise<TaskPayload> {
    // Here we only need the resultSerializer, because reducing is a function
    // of type ([Result, Result]) => Result
    const serializer = task.resultSerializer();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const payloadArray: [string, string] = JSON.parse(payload.payload);
    const r1 = serializer.fromJSON(payloadArray[0]);
    const r2 = serializer.fromJSON(payloadArray[1]);

    const result = await task.reduce(r1, r2);

    return {
      name: payload.name,
      payload: serializer.toJSON(result),
      taskId: payload.taskId,
    };
  }

  private async doMapStep<Input, Result>(
    task: MappingTask<Input, Result>,
    payload: TaskPayload
  ): Promise<TaskPayload> {
    const input = task.inputSerializer().fromJSON(payload.payload);

    const result = await task.map(input);

    return {
      name: payload.name,
      payload: task.resultSerializer().toJSON(result),
      taskId: payload.taskId,
    };
  }

  public async start() {
    // Call all task's prepare() method
    // Call them in order of registration, because the prepare methods
    // might depend on each other or a result that is saved in a DI singleton
    for (const task of this.tasks) {
      // eslint-disable-next-line no-await-in-loop
      await task.task.prepare();
    }

    this.workers = Object.entries(
      groupBy(this.tasks, (task) => task.queue)
    ).map((tasks) => this.initHandler(tasks[0], tasks[1]));
  }

  public async close() {
    await Promise.all(
      this.workers.map(async (worker) => {
        await worker.close();
      })
    );
  }
}
