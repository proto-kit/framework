// eslint-disable-next-line id-length
import _ from "lodash";

import { MapReduceTask, ReducableTask, TaskPayload } from "../manager/ReducableTask";
import { Closeable, TaskQueue } from "../queue/TaskQueue";

const errors = {
  notComputable: () => new Error("Task not computable on selected worker"),

  multipleTasksOnQueue: () => new Error("Multiple tasks per queue name are not supported"),
};

export class TaskWorker implements Closeable {
  private readonly tasks: {
    queue: string;
    task: ReducableTask<any>;
    handler: (payload: TaskPayload) => Promise<TaskPayload | undefined>;
  }[] = [];

  private readonly queue: TaskQueue;

  private workers: Closeable[] = [];

  public constructor(mq: TaskQueue) {
    this.queue = mq;
  }

  public addReducableTask<Result>(queue: string, task: ReducableTask<Result>) {
    const serializer = task.serializer();

    this.tasks.push({
      queue,
      task,

      handler: async (payload) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const payloadArray: [string, string] = JSON.parse(payload.payload);
        const r1 = serializer.fromJSON(payloadArray[0]);
        const r2 = serializer.fromJSON(payloadArray[1]);

        const result = await task.reduce(r1, r2);

        return {
          name: payload.name,
          payload: serializer.toJSON(result),
        };
      },
    });
  }

  public addMapReduceTask<Input, Result>(queue: string, task: MapReduceTask<Input, Result>) {
    const serializer = task.serializer();

    this.tasks.push({
      queue,
      task,

      handler: async (payload) => {
        if (payload.name === `${task.name()}_map`) {
          const inputSerializer = task.inputSerializer();
          const input = inputSerializer.fromJSON(payload.payload);

          const result = await task.map(input);

          return {
            name: payload.name,
            payload: serializer.toJSON(result),
          };
        }
        if (payload.name === task.name()) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const payloadArray: [string, string] = JSON.parse(payload.payload);
          const r1 = serializer.fromJSON(payloadArray[0]);
          const r2 = serializer.fromJSON(payloadArray[1]);

          const result = await task.reduce(r1, r2);

          return {
            name: payload.name,
            payload: serializer.toJSON(result),
          };
        }
        return undefined;
      },
    });
  }

  public async init() {
    this.workers = Object.entries(_.groupBy(this.tasks, (task) => task.queue))
      .map((tasks) =>

      this.queue.createWorker(tasks[0], async (data) => {
        if (tasks[1].length > 1) {
          throw errors.multipleTasksOnQueue();
        }
        // tasks[1][0]
        const [, [task]] = tasks;

        const result = await task.handler(data);
        if (result === undefined) {
          throw errors.notComputable();
        }

        return result;
      })
    );
  }

  public async close() {
    await Promise.all(this.workers.map((worker) => worker.close()));
  }
}
