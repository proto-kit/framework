// eslint-disable-next-line max-len
/* eslint-disable promise/avoid-new,promise/prefer-await-to-then,promise/always-return,@typescript-eslint/no-empty-function,etc/no-implicit-any-catch,putout/putout */

import { Closeable, InstantiatedQueue, TaskQueue } from "../queue/TaskQueue";

import { MapReduceTask, ReducableTask, TaskPayload, TaskSerializer } from "./ReducableTask";

const errors = {
  taskNotTerminating: () => new Error("Task not terminating"),
};

/**
 * Task-runner that has the responsibility of pushing and coordinating the computing of a task with the corresponding inputs.
 *
 * This instance takes a ReduceableTask and runs it on a given TaskQueue
 */
export class ReducingTaskRunner<Type> implements Closeable {
  protected serializer: TaskSerializer<Type> = this.task.serializer();

  protected queue?: InstantiatedQueue = undefined;

  protected openCloseables: Closeable[] = [];

  // The queue of all inputs that aren't yet submitted in a task
  private pendingInputs: Type[] = [];

  private runningTaskCount = 0;

  /**
   * @param messageQueue The connection object to the messageQueue
   * @param task The task definition to be executed
   * @param queueName The name of the queue on which the task should be executed (workers have to listen on that queue)
   */
  public constructor(
    protected readonly messageQueue: TaskQueue,
    protected readonly task: ReducableTask<Type>,
    protected readonly queueName: string
  ) {}

  private resolveReducibleTasks(): { r1: Type; r2: Type }[] {
    const res: { r1: Type; r2: Type }[] = [];

    let { pendingInputs } = this;

    for (let index = 0; index < pendingInputs.length; index++) {
      const first = pendingInputs[index];
      const secondIndex = pendingInputs.findIndex((second, index2) => {
        return index2 > index && this.task.reducible(first, second);
      });

      if (secondIndex > 0) {
        const second = pendingInputs[secondIndex];
        pendingInputs = pendingInputs.filter((_, index2) => index2 !== index && index2 !== secondIndex);

        res.push({ r1: first, r2: second });
      }
    }

    this.pendingInputs = pendingInputs;

    return res;
  }

  private async pushReduction(t1: Type, t2: Type) {
    const payload: TaskPayload = {
      name: this.task.name(),
      payload: JSON.stringify([this.serializer.toJSON(t1), this.serializer.toJSON(t2)]),
    };

    console.log(`Pushed Reduction: ${JSON.stringify([t1, t2])}`);

    return await this.queue!.addTask(payload);
  }

  private async pushAvailableReductions() {
    const tasks = this.resolveReducibleTasks();

    const promises = tasks.map(async ({ r1, r2 }) =>
      await this.pushReduction(r1, r2)
    );

    // We additionally need this count, because otherwise there would be a race condition to mark a task as completed, if we would do it via runningTasks
    this.runningTaskCount += tasks.length;

    await Promise.all(promises);
  }

  protected async handleCompleted(payload: TaskPayload, resolve: (result: Type) => void) {
    const parsed = this.serializer.fromJSON(payload.payload);

    this.runningTaskCount -= 1;

    this.pendingInputs.push(parsed);

    if (this.pendingInputs.length >= 2) {
      await this.pushAvailableReductions();
    } else if (this.runningTaskCount === 0 && this.pendingInputs.length === 1) {
      // Report result
      await this.queue!.close();
      resolve(this.pendingInputs[0]);
    } else if (this.runningTaskCount === 0 && this.pendingInputs.length === 0) {
      throw errors.taskNotTerminating();
      // Error
    }
  }

  protected async addInput(...inputs: Type[]) {
    this.pendingInputs.push(...inputs);
    await this.pushAvailableReductions();
  }

  public async executeReduce(inputs: Type[]): Promise<Type> {
    // Why these weird functions? To get direct promise usage to a minimum
    const start = async (resolve: (type: Type) => void) => {
      await this.queue!.onCompleted(async (result) => {
        await this.handleCompleted(result.payload, resolve);
      });

      this.pendingInputs = Array.from(inputs);

      // Push initial tasks
      await this.pushAvailableReductions();
    };

    return await this.execute(start);
  }

  protected async execute(
    executor: (resolve: (type: Type) => void) => Promise<void>
  ) : Promise<Type> {
    const queue = await this.messageQueue.getQueue(this.queueName);
    this.queue = queue;

    this.openCloseables.push(queue);

    const promise = new Promise<Type>((resolve, reject) => {
      executor(resolve)
        // Do we need then()?
        .then(() => {})
        .catch((err) => reject(err));
    });

    return await promise;
  }

  public async close(): Promise<void> {
    await Promise.all(this.openCloseables.map((x) => x.close()));
  }
}

export class MapReduceTaskRunner<Input, Result> extends ReducingTaskRunner<Result> {
  public constructor(
    messageQueue: TaskQueue,
    task: MapReduceTask<Input, Result>,
    queueName: string
  ) {
    super(messageQueue, task, queueName);
  }

  public async executeMapReduce(inputs: Input[]): Promise<Result> {
    const start = async (resolve: (type: Result) => void) => {
      const queue = this.queue!;

      await queue.onCompleted(async (result) => {
        const { payload } = result;

        if (payload.name === this.task.name()) {
          await super.handleCompleted(payload, resolve);
          // eslint-disable-next-line sonarjs/elseif-without-else
        } else if (payload.name === `${this.task.name()}_map`) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const parsedResult: Result = JSON.parse(payload.payload);
          await super.addInput(parsedResult);
        }
      });

      const inputQueue = Array.from(inputs);

      // Push initial tasks
      const initialPromises = inputQueue.map(
        async (input) =>
          await queue.addTask({
            name: `${this.task.name()}_map`,
            payload: JSON.stringify(input),
          })
      );
      await Promise.all(initialPromises);
    };
    return await this.execute(start);
  }
}
