/* eslint-disable promise/avoid-new */
import { log, noop } from "@proto-kit/common";

import { Closeable, InstantiatedQueue, TaskQueue } from "../queue/TaskQueue";

import { MapReduceTask, TaskPayload, TaskSerializer } from "./ReducableTask";

const errors = {
  taskNotTerminating: (taskName: string) =>
    new Error(`Task ${taskName} not terminating`),

  queueIsUndefined: () =>
    new Error(
      "Queue not initialized, call this method only through executeFlowWithQueue()"
    ),
};

export const TASKS_REDUCE_SUFFIX = "_reduce";

/**
 * Task-runner that has the responsibility of pushing and coordinating
 * the computing of a task with the corresponding inputs.
 *
 * This instance takes a ReduceableTask and runs it on a given TaskQueue
 */
export class MapReduceFlow<Input, Result> implements Closeable {
  protected serializer: TaskSerializer<Result> =
    this.mapReduceTask.resultSerializer();

  protected queue?: InstantiatedQueue = undefined;

  // flowId => state
  private executionState: Record<
    string,
    {
      // The queue of all inputs that aren't yet submitted in a task
      pendingInputs: Result[];
      runningTaskCount: number;
    }
  > = {};

  protected openCloseables: Closeable[] = [];

  protected onCompletedListeners: {
    [key: string]: (payload: TaskPayload) => Promise<void>;
  } = {};

  /**
   * @param messageQueue The connection object to the messageQueue
   * @param mapReduceTask The task definition to be executed
   * @param queueName The name of the queue on which the task should be
   * executed (workers have to listen on that queue)
   */
  public constructor(
    protected readonly messageQueue: TaskQueue,
    protected readonly mapReduceTask: MapReduceTask<Input, Result>,
    protected readonly queueName: string
  ) {}

  protected assertQueueNotNull(
    queue: InstantiatedQueue | undefined
  ): asserts queue is InstantiatedQueue {
    if (queue === undefined) {
      throw errors.queueIsUndefined();
    }
  }

  private resolveReducibleTasks(flowId: string): { r1: Result; r2: Result }[] {
    const res: { r1: Result; r2: Result }[] = [];

    const { mapReduceTask, executionState } = this;
    let { pendingInputs } = executionState[flowId];

    for (const [index, first] of pendingInputs.entries()) {
      const secondIndex = pendingInputs.findIndex(
        (second, index2) =>
          index2 > index && mapReduceTask.reducible(first, second)
      );

      if (secondIndex > 0) {
        const r2 = pendingInputs[secondIndex];
        pendingInputs = pendingInputs.filter(
          (unused, index2) => index2 !== index && index2 !== secondIndex
        );

        res.push({ r1: first, r2 });
      }
    }

    executionState[flowId].pendingInputs = pendingInputs;

    return res;
  }

  private async pushReduction(flowId: string, t1: Result, t2: Result) {
    const payload: TaskPayload = {
      name: `${this.mapReduceTask.name()}${TASKS_REDUCE_SUFFIX}`,

      payload: JSON.stringify([
        this.serializer.toJSON(t1),
        this.serializer.toJSON(t2),
      ]),

      flowId,
    };

    log.debug(`Pushed Reduction: ${JSON.stringify([String(t1), String(t2)])}`);

    const { queue } = this;
    this.assertQueueNotNull(queue);

    return await queue.addTask(payload);
  }

  protected async pushAvailableReductions(flowId: string) {
    const tasks = this.resolveReducibleTasks(flowId);

    const promises = tasks.map(
      async ({ r1, r2 }) => await this.pushReduction(flowId, r1, r2)
    );

    // We additionally need this count, because otherwise there would be a race
    // condition to mark a task as completed, if we would do it via runningTasks
    this.executionState[flowId].runningTaskCount += tasks.length;

    await Promise.all(promises);
  }

  // Handles the result of a reduce operation
  // It checks whether new reductions are available to compute or if the
  // reduction has been completed
  protected async handleCompletedReducingStep(
    flowId: string,
    payload: TaskPayload,
    resolve: (result: Result) => void
  ) {
    const parsed = this.serializer.fromJSON(payload.payload);

    this.executionState[flowId].runningTaskCount -= 1;

    const { queue, mapReduceTask, executionState } = this;
    const { pendingInputs, runningTaskCount } = executionState[flowId];

    pendingInputs.push(parsed);

    this.assertQueueNotNull(queue);

    if (pendingInputs.length >= 2) {
      await this.pushAvailableReductions(flowId);
    } else if (runningTaskCount === 0 && pendingInputs.length === 1) {
      // Report result
      await queue.close();
      resolve(pendingInputs[0]);
    } else if (runningTaskCount === 0 && pendingInputs.length === 0) {
      throw errors.taskNotTerminating(mapReduceTask.name());
    } else {
      // Do nothing
    }
  }

  protected async addInput(flowId: string, ...inputs: Result[]) {
    this.executionState[flowId].pendingInputs.push(...inputs);
    await this.pushAvailableReductions(flowId);
  }

  public async executeMapReduce(
    flowId: string,
    inputs: Input[]
  ): Promise<Result> {
    // Why these weird functions? To get direct promise usage to a minimum
    const start = async (resolve: (type: Result) => void) => {
      const { queue, mapReduceTask, onCompletedListeners } = this;
      this.assertQueueNotNull(queue);

      // Register result listener
      onCompletedListeners[flowId] = async (payload) => {
        if (payload.name === `${mapReduceTask.name()}${TASKS_REDUCE_SUFFIX}`) {
          await this.handleCompletedReducingStep(flowId, payload, resolve);
          // eslint-disable-next-line sonarjs/elseif-without-else
        } else if (payload.name === mapReduceTask.name()) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const parsedResult: Result = JSON.parse(payload.payload);
          await this.addInput(flowId, parsedResult);
        }
      };

      const inputQueue = Array.from(inputs);

      const inputSerializer = mapReduceTask.inputSerializer();

      // Push initial tasks
      const initialPromises = inputQueue.map(
        async (input) =>
          await queue.addTask({
            name: mapReduceTask.name(),
            payload: inputSerializer.toJSON(input),
            flowId,
          })
      );
      await Promise.all(initialPromises);
    };
    return await this.executeFlowWithQueue(flowId, start);
  }

  /**
   * Executes a function that handles the processing of the flow while
   * opening a queue instance and handling errors
   */
  protected async executeFlowWithQueue(
    flowId: string,
    executor: (resolve: (type: Result) => void) => Promise<void>
  ): Promise<Result> {
    this.executionState[flowId] = {
      pendingInputs: [],
      runningTaskCount: 0,
    };
    if (this.queue === undefined) {
      const queue = await this.messageQueue.getQueue(this.queueName);
      this.queue = queue;

      await queue.onCompleted(async (payload) => {
        const listener = this.onCompletedListeners[payload.flowId];
        if (listener !== undefined) {
          await listener(payload);
        }
      });

      this.openCloseables.push(queue);
    }

    const boundExecutor = executor.bind(this);

    const promise = new Promise<Result>((resolve, reject) => {
      boundExecutor(resolve)
        // Do we need then()?
        // eslint-disable-next-line promise/prefer-await-to-then
        .then(noop)
        // eslint-disable-next-line promise/prefer-await-to-then
        .catch((error: unknown) => {
          reject(error);
        });
    });

    return await promise;
  }

  public async close(): Promise<void> {
    await Promise.all(
      this.openCloseables.map(async (closeable) => {
        await closeable.close();
      })
    );
  }
}
