import { Task } from "./Task";
import { Closeable, InstantiatedQueue, TaskQueue } from "../queue/TaskQueue";
import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { TaskPayload } from "../manager/ReducableTask";

const errors = {
  resolveNotDefined: () =>
    new Error(
      "The resolve callback has not been initialized yet. Call .withFlow() first!"
    ),
};

@injectable()
// ResolutionScoped => We want a new instance every time we resolve it
@scoped(Lifecycle.ResolutionScoped)
export class ConnectionHolder implements Closeable {
  private queues: {
    [key: string]: InstantiatedQueue;
  } = {};

  private listeners: {
    [key: string]: {
      [key: string]: (payload: TaskPayload) => Promise<void>;
    };
  } = {};

  public constructor(
    @inject("TaskQueue") private readonly queueImpl: TaskQueue
  ) {}

  private async openQueue(name: string): Promise<InstantiatedQueue> {
    const queue = await this.queueImpl.getQueue(name);
    await queue.onCompleted(async (payload) => {
      await this.onCompleted(name, payload);
    });
    return queue;
  }

  private async onCompleted(name: string, payload: TaskPayload) {
    const listener = this.listeners[name]?.[payload.flowId];
    if (listener !== undefined) {
      await listener(payload);
    }
  }

  public registerListener(
    flowId: string,
    queue: string,
    listener: (payload: TaskPayload) => Promise<void>
  ) {
    if (this.listeners[queue] === undefined) {
      this.listeners[queue] = {};
    }
    this.listeners[queue][flowId] = listener;
  }

  public unregisterListener(flowId: string, queue: string) {
    delete this.listeners[queue][flowId];
  }

  public async getQueue(name: string) {
    if (this.queues[name] !== undefined) {
      return this.queues[name];
    }
    const queue = await this.openQueue(name);
    this.queues[name] = queue;
    return queue;
  }

  async close() {
    //TODO
  }
}

@injectable()
export class FlowCreator {
  public constructor(private readonly connectionHolder: ConnectionHolder) {}

  public createFlow<State>(flowId: string, state: State): Flow<State> {
    return new Flow(this.connectionHolder, flowId, state);
  }
}

interface CompletedCallback<Input, Result> {
  (result: Result, originalInput: Input): Promise<any>;
}

export class Flow<State> implements Closeable {
  public constructor(
    private readonly connectionHolder: ConnectionHolder,
    private readonly flowId: string,
    public state: State
  ) {}

  private waitForResult(
    queue: string,
    taskId: string,
    callback: (payload: TaskPayload) => void
  ) {
    this.resultsPending[taskId] = callback;

    if (!this.registeredListeners.includes(queue)) {
      // Open Listener onto Connectionhandler
      this.connectionHolder.registerListener(
        this.flowId,
        queue,
        async (payload) => {
          if (payload.taskId !== undefined) {
            const resolveFn = this.resultsPending[payload.taskId];
            if (resolveFn !== undefined) {
              delete this.resultsPending[payload.taskId];
              resolveFn(payload);
            }
          }
        }
      );
      this.registeredListeners.push(queue);
    }
  }

  private registeredListeners: string[] = [];
  private resultsPending: {
    [key: string]: (payload: TaskPayload) => void;
  } = {};

  private taskCounter = 0;

  private resolveFunction?: (result: any) => void;

  public tasksInProgress = 0;

  public resolve<Result>(result: Result) {
    if (this.resolveFunction === undefined) {
      throw errors.resolveNotDefined();
    }
    this.resolveFunction(result);
  }

  public async pushTask<Input, Result>(
    task: Task<Input, Result>,
    input: Input,
    completed?: CompletedCallback<Input, Result>,
    overrides?: {
      taskName?: string;
    }
  ): Promise<void> {
    const queueName = task.name;
    const taskName = overrides?.taskName ?? task.name;
    const queue = await this.connectionHolder.getQueue(queueName);

    const payload = task.inputSerializer().toJSON(input);

    this.taskCounter += 1;
    const taskId = String(this.taskCounter);

    console.log(`Pushing ${task.name}`);

    await queue.addTask({
      // eslint-disable-next-line putout/putout
      name: taskName,
      taskId,
      flowId: this.flowId,
      payload,
    });

    this.tasksInProgress += 1;

    const callback = (returnPayload: TaskPayload) => {
      console.log(`Completed ${returnPayload.name}`);
      const decoded = task.resultSerializer().fromJSON(returnPayload.payload);
      this.tasksInProgress -= 1;
      return completed?.(decoded, input);
    };
    this.waitForResult(queueName, taskId, callback);
  }

  public async forEach<Type>(
    inputs: Type[],
    fun: (input: Type, index: number, arr: Type[]) => Promise<void>
  ) {
    const promises = inputs.map(fun);
    await Promise.all(promises);
  }

  public async withFlow<Result>(
    executor: (
      resolve: (result: Result) => void,
      reject: (reason: any) => void
    ) => Promise<void>
  ): Promise<Result> {
    return await new Promise<Result>((resolve, reject) => {
      this.resolveFunction = resolve;
      void executor(resolve, reject);
    });
  }

  public async close() {
    this.registeredListeners.forEach((queue) => {
      this.connectionHolder.unregisterListener(this.flowId, queue);
    });
  }
}
