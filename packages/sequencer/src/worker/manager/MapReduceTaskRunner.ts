/* eslint-disable max-len,promise/avoid-new,promise/prefer-await-to-then,promise/always-return,@typescript-eslint/no-empty-function,etc/no-implicit-any-catch,putout/putout */
import { Closeable, InstantiatedQueue, TaskQueue } from "../queue/TaskQueue";

import {
  MapReduceTask,
  ReducableTask,
  TaskPayload,
  TaskSerializer,
} from "./ReducableTask";

const errors = {
  taskNotTerminating: () => new Error("Task not terminating"),

  queueIsUndefined: () =>
    new Error("Queue not initialized, call this method only through execute()"),
};

/**
 * Task-runner that has the responsibility of pushing and coordinating the computing of a task with the corresponding inputs.
 *
 * This instance takes a ReduceableTask and runs it on a given TaskQueue
 */
export class ReducingTaskRunner<Type> implements Closeable {
  protected serializer: TaskSerializer<Type> =
    this.reducableTask.resultSerializer();

  protected queue?: InstantiatedQueue = undefined;

  protected openCloseables: Closeable[] = [];

  // The queue of all inputs that aren't yet submitted in a task
  private pendingInputs: Type[] = [];

  private runningTaskCount = 0;

  /**
   * @param messageQueue The connection object to the messageQueue
   * @param reducableTask The task definition to be executed
   * @param queueName The name of the queue on which the task should be executed (workers have to listen on that queue)
   */
  public constructor(
    protected readonly messageQueue: TaskQueue,
    protected readonly reducableTask: ReducableTask<Type>,
    protected readonly queueName: string
  ) {}

  protected assertQueueNotNull(
    queue: InstantiatedQueue | undefined
  ): asserts queue is InstantiatedQueue {
    if (queue !== undefined) {
      throw errors.queueIsUndefined();
    }
  }

  private resolveReducibleTasks(): { r1: Type; r2: Type }[] {
    const res: { r1: Type; r2: Type }[] = [];

    let { pendingInputs } = this;
    const { reducableTask } = this;

    for (let index = 0; index < pendingInputs.length; index++) {
      const first = pendingInputs[index];
      const secondIndex = pendingInputs.findIndex(
        (second, index2) =>
          index2 > index && reducableTask.reducible(first, second)
      );

      if (secondIndex > 0) {
        const second = pendingInputs[secondIndex];
        pendingInputs = pendingInputs.filter(
          (unused, index2) => index2 !== index && index2 !== secondIndex
        );

        res.push({ r1: first, r2: second });
      }
    }

    this.pendingInputs = pendingInputs;

    return res;
  }

  private async pushReduction(t1: Type, t2: Type) {
    const payload: TaskPayload = {
      name: this.reducableTask.name(),

      payload: JSON.stringify([
        this.serializer.toJSON(t1),
        this.serializer.toJSON(t2),
      ]),
    };

    console.log(
      `Pushed Reduction: ${JSON.stringify([String(t1), String(t2)])}`
    );

    const { queue } = this;
    this.assertQueueNotNull(queue);

    return await queue.addTask(payload);
  }

  protected async pushAvailableReductions() {
    const tasks = this.resolveReducibleTasks();

    const promises = tasks.map(
      async ({ r1, r2 }) => await this.pushReduction(r1, r2)
    );

    // We additionally need this count, because otherwise there would be a race condition to mark a task as completed, if we would do it via runningTasks
    this.runningTaskCount += tasks.length;

    await Promise.all(promises);
  }

  // Handles the result of a reduce operation
  // It checks whether new reductions are available to compute or if the reduction has been completed
  protected async handleCompletedReducingStep(
    payload: TaskPayload,
    resolve: (result: Type) => void
  ) {
    const parsed = this.serializer.fromJSON(payload.payload);

    this.runningTaskCount -= 1;

    const { queue, pendingInputs, runningTaskCount } = this;

    pendingInputs.push(parsed);

    this.assertQueueNotNull(queue);

    if (pendingInputs.length >= 2) {
      await this.pushAvailableReductions();
    } else if (runningTaskCount === 0 && pendingInputs.length === 1) {
      // Report result
      await queue.close();
      resolve(pendingInputs[0]);
    } else if (runningTaskCount === 0 && pendingInputs.length === 0) {
      throw errors.taskNotTerminating();
    } else {
      // Do nothing
    }
  }

  protected async addInput(...inputs: Type[]) {
    this.pendingInputs.push(...inputs);
    await this.pushAvailableReductions();
  }

  public async executeReduce(inputs: Type[]): Promise<Type> {
    const { queue } = this;
    this.assertQueueNotNull(queue);

    // Why these weird functions? To get direct promise usage to a minimum
    const start = async (resolve: (type: Type) => void) => {
      await queue.onCompleted(async (result) => {
        await this.handleCompletedReducingStep(result.payload, resolve);
      });

      this.pendingInputs = Array.from(inputs);

      // Push initial tasks
      await this.pushAvailableReductions();
    };

    return await this.execute(start);
  }

  protected async execute(
    executor: (resolve: (type: Type) => void) => Promise<void>
  ): Promise<Type> {
    const queue = await this.messageQueue.getQueue(this.queueName);
    this.queue = queue;

    this.openCloseables.push(queue);

    const promise = new Promise<Type>((resolve, reject) => {
      executor(resolve)
        // Do we need then()?
        .then(() => {})
        .catch((error) => {
          reject(error);
        });
    });

    return await promise;
  }

  public async close(): Promise<void> {
    await Promise.all(
      this.openCloseables.map(async (x) => {
        await x.close();
      })
    );
  }
}

export class MapReduceTaskRunner<
  Input,
  Result
> extends ReducingTaskRunner<Result> {
  public constructor(
    messageQueue: TaskQueue,
    protected readonly mapReduceTask: MapReduceTask<Input, Result>,
    queueName: string
  ) {
    super(messageQueue, mapReduceTask, queueName);
  }

  public async executeMapReduce(inputs: Input[]): Promise<Result> {
    const start = async (resolve: (type: Result) => void) => {
      const { queue, mapReduceTask } = this;
      this.assertQueueNotNull(queue);

      await queue.onCompleted(async (result) => {
        const { payload } = result;

        if (payload.name === `${mapReduceTask.name()}_redice`) {
          await super.handleCompletedReducingStep(payload, resolve);
          // eslint-disable-next-line sonarjs/elseif-without-else
        } else if (payload.name === mapReduceTask.name()) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const parsedResult: Result = JSON.parse(payload.payload);
          await super.addInput(parsedResult);
        }
      });

      const inputQueue = Array.from(inputs);

      const inputSerializer = mapReduceTask.inputSerializer();

      // Push initial tasks
      const initialPromises = inputQueue.map(
        async (input) =>
          await queue.addTask({
            name: `${mapReduceTask.name()}_map`,
            payload: inputSerializer.toJSON(input),
          })
      );
      await Promise.all(initialPromises);
    };
    return await this.execute(start);
  }
}
