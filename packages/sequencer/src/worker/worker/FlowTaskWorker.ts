import { log } from "@proto-kit/common";

import { Closeable, TaskQueue } from "../queue/TaskQueue";
import { Task, TaskPayload } from "../flow/Task";
import { AbstractStartupTask } from "../flow/AbstractStartupTask";
import { UnpreparingTask } from "../flow/UnpreparingTask";

const errors = {
  notComputable: (name: string) =>
    new Error(`Task ${name} not computable on selected worker`),
};

// Had to use any here, because otherwise you couldn't assign any tasks to it
export class FlowTaskWorker<Tasks extends Task<any, any>[]>
  implements Closeable
{
  private readonly queue: TaskQueue;

  private workers: Record<string, Closeable> = {};

  public constructor(
    mq: TaskQueue,
    private readonly tasks: Tasks
  ) {
    this.queue = mq;
  }

  // The array type is this weird, because we first want to extract the
  // element type, and after that, we expect multiple elements of that -> []
  private initHandler<Input, Output>(task: Task<Input, Output>) {
    log.debug(`Init task handler ${task.name}`);
    const queueName = task.name;
    return this.queue.createWorker(queueName, async (data) => {
      log.debug(`Received task ${data.taskId} in queue ${queueName}`);

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

        log.debug(
          `Responding to task ${data.taskId} with ${result.payload.slice(0, 100)}`
        );

        return result;
      } catch (error: unknown) {
        const payload =
          error instanceof Error ? error.message : JSON.stringify(error);

        log.info("Error in worker (detailed trace): ");
        log.info(error);

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

  preparePromise?: Promise<void>;

  prepareResolve?: () => void;

  public waitForPrepared(): Promise<void> {
    return this.preparePromise!;
  }

  public async prepareTasks(tasks: Task<unknown, unknown>[]) {
    log.info("Preparing tasks...");

    // Call all task's prepare() method
    // Call them in order of registration, because the prepare methods
    // might depend on each other or a result that is saved in a DI singleton
    for (const task of tasks) {
      log.debug(`Preparing task ${task.constructor.name}`);
      // eslint-disable-next-line no-await-in-loop
      await task.prepare();
      log.trace(`${task.constructor.name} prepared`);
    }

    const newWorkers = Object.fromEntries(
      tasks
        .filter((x) => !(x instanceof AbstractStartupTask))
        .map((task) => [task.name, this.initHandler(task)])
    );
    this.workers = {
      ...this.workers,
      ...newWorkers,
    };

    this.prepareResolve!();
  }

  public async start() {
    function isAbstractStartupTask(
      task: Task<unknown, unknown>
    ): task is AbstractStartupTask<unknown, unknown> {
      return task instanceof AbstractStartupTask;
    }

    function isUnpreparingTask(
      task: Task<unknown, unknown>
    ): task is UnpreparingTask<unknown, unknown> {
      return task instanceof UnpreparingTask;
    }

    const startupTasks = this.tasks.filter<AbstractStartupTask<any, any>>(
      isAbstractStartupTask
    );

    const unpreparingTasks = this.tasks.filter(isUnpreparingTask);

    const normalTasks = this.tasks.filter(
      (task) => !isUnpreparingTask(task) && !isAbstractStartupTask(task)
    );

    const preparePromise = new Promise<void>((res) => {
      this.prepareResolve = res;
    });
    this.preparePromise = preparePromise;

    if (startupTasks.length > 0) {
      this.workers = Object.fromEntries(
        unpreparingTasks
          .concat(startupTasks)
          .map((task) => [task.name, this.initHandler(task)])
      );

      let startupTasksLeft = startupTasks.length;
      startupTasks.forEach((task) => {
        // The callbacks promise not being awaited is fine here
        task.events.on("startup-task-finished", async () => {
          await this.workers[task.name].close();
          delete this.workers[task.name];
          startupTasksLeft -= 1;

          if (startupTasksLeft === 0) {
            await this.prepareTasks(normalTasks);
          }
        });
      });
    } else {
      await this.prepareTasks(normalTasks.concat(unpreparingTasks));
    }
  }

  public async close() {
    await Promise.all(
      Object.values(this.workers).map(async (worker) => {
        await worker.close();
      })
    );
    this.workers = {};
  }
}
