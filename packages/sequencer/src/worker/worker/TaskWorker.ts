// eslint-disable-next-line import/no-extraneous-dependencies
import groupBy from "lodash/groupBy";

import {
  AbstractTask,
  MappingTask,
  MapReduceTask,
  ReducableTask,
  TaskPayload,
} from "../manager/ReducableTask";
import { Closeable, TaskQueue } from "../queue/TaskQueue";

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
        if (payload.name === `${task.name()}_reduce`) {
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
        console.log(`${payload.name} ${JSON.stringify(payload)}`);
        if (payload.name === task.name()) {
          return await this.doMapStep(task, payload);
        }
        if (payload.name === `${task.name()}_reduce`) {
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
        console.log(`${payload.name} ${JSON.stringify(payload)}`);
        if (payload.name === task.name()) {
          return await this.doMapStep(task, payload);
        }
        return undefined;
      },
    });
  }

  private async doReduceStep<Result>(
    task: ReducableTask<Result>,
    payload: TaskPayload
  ): Promise<TaskPayload> {
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
    console.log(input);
    const result = await task.map(input);

    return {
      name: payload.name,
      payload: task.resultSerializer().toJSON(result),
      taskId: payload.taskId,
    };
  }

  public async init() {
    this.workers = Object.entries(
      groupBy(this.tasks, (task) => task.queue)
    ).map((tasks) =>
      this.queue.createWorker(tasks[0], async (data) => {
        // Use first handler that returns a non-undefined result
        // eslint-disable-next-line @typescript-eslint/init-declarations
        let result: TaskPayload | undefined;
        for (const task of tasks[1]) {
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
      })
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
