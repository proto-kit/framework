import _ from "lodash";

import { MapReduceTask, ReducableTask, TaskPayload } from "../manager/ReducableTask";
import { Closeable, TaskQueue } from "../queue/TaskQueue";

const errors = {
  notComputable: () =>
    new Error("Task not computable on selected worker"),
  multipleTasksOnQueue: () =>
    new Error("Multiple tasks per queue name are not supported")
}

export class TaskWorker implements Closeable {
  private readonly tasks: { queue: string; task: ReducableTask<any>, handler: (payload: TaskPayload) => Promise<TaskPayload | undefined> }[] = [];
  private readonly queue: TaskQueue;

  private workers: Closeable[] = [];

  constructor(mq: TaskQueue) {
    // this.tasks = tasks;
    this.queue = mq;
  }

  public addReducableTask<Result>(queue: string, task: ReducableTask<Result>) {
    const serializer = task.serializer();

    this.tasks.push({
      queue,
      task,

      handler: async (payload) => {
        let payloadArray: [string, string] = JSON.parse(payload.payload);
        let r1 = serializer.fromJSON(payloadArray[0]);
        let r2 = serializer.fromJSON(payloadArray[1]);

        let result = await task.reduce(r1, r2);

        return {
          name: payload.name,
          payload: serializer.toJSON(result),
        };
      }
    })
  }

  public addMapReduceTask<Input, Result>(queue: string, task: MapReduceTask<Input, Result>) {
    const serializer = task.serializer();

    this.tasks.push({
      queue,
      task,

      handler: async (payload) => {
        console.log(payload);
        if(payload.name === task.name() + "_map"){

          const inputSerializer = task.inputSerializer()
          const input = inputSerializer.fromJSON(payload.payload);

          const result = await task.map(input);

          return {
            name: payload.name,
            payload: serializer.toJSON(result),
          };

        } else if(payload.name === task.name()) {

          let payloadArray: [string, string] = JSON.parse(payload.payload);
          let r1 = serializer.fromJSON(payloadArray[0]);
          let r2 = serializer.fromJSON(payloadArray[1]);

          let result = await task.reduce(r1, r2);

          return {
            name: payload.name,
            payload: serializer.toJSON(result),
          };

        }else{
          return undefined
        }

      }
    })
  }

  async init() {
    this.workers = Object.entries(_.groupBy(this.tasks, (t) => t.queue)).map((tasks) => {
      return this.queue.createWorker(tasks[0], async (data) => {
        // const task = tasks[1].find((task) => task.task.name() === data.name);
        if(tasks[1].length > 1){
          throw errors.multipleTasksOnQueue()
        }
        const task = tasks[1][0]

        if (task === undefined) {
          throw Error("Task requested not found");
        } else {
          const result = await task.handler(data)
          if(result === undefined){
            throw errors.notComputable();
          }
          return result;
        }
      });
    });
  }

  async close() {
    await Promise.all(this.workers.map(worker => worker.close()));
  }
}
